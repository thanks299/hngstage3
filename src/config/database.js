const { Pool } = require("pg");
require("dotenv").config();

// Support both DATABASE_URL (Render) and individual variables (local)
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    }
  : {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

const pool = new Pool(poolConfig);

pool.on("connect", () => {
  console.log("Connected to PostgreSQL database");
  if (process.env.DATABASE_URL) {
    console.log("Using DATABASE_URL connection");
  } else {
    console.log("Using individual DB variables");
  }
});

pool.on("error", (err) => {
  console.error("Unexpected database error:", err);
});

// Initialize database tables (for Stage 2 compatibility)
const initDatabase = async () => {
  const client = await pool.connect();
  try {
    // Enable UUID extension
    await client.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    // Create profiles table if it doesn't exist (from Stage 2)
    await client.query(`
            CREATE TABLE IF NOT EXISTS profiles (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(255) NOT NULL UNIQUE,
                gender VARCHAR(50),
                gender_probability FLOAT,
                age INTEGER,
                age_group VARCHAR(50),
                country_id VARCHAR(10),
                country_name VARCHAR(255),
                country_probability FLOAT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE INDEX IF NOT EXISTS idx_profiles_name ON profiles(name);
            CREATE INDEX IF NOT EXISTS idx_profiles_gender ON profiles(gender);
            CREATE INDEX IF NOT EXISTS idx_profiles_age_group ON profiles(age_group);
            CREATE INDEX IF NOT EXISTS idx_profiles_country_id ON profiles(country_id);
            CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);
        `);

    // Create users table
    await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                github_id VARCHAR(255) UNIQUE NOT NULL,
                username VARCHAR(255) NOT NULL,
                email VARCHAR(255),
                avatar_url TEXT,
                role VARCHAR(50) DEFAULT 'analyst',
                is_active BOOLEAN DEFAULT true,
                last_login_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE INDEX IF NOT EXISTS idx_users_github_id ON users(github_id);
            CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
        `);

    // Create refresh_tokens table
    await client.query(`
            CREATE TABLE IF NOT EXISTS refresh_tokens (
                id SERIAL PRIMARY KEY,
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                token VARCHAR(500) NOT NULL UNIQUE,
                expires_at TIMESTAMP NOT NULL,
                revoked_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
            CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
        `);

    console.log("✅ Database tables initialized successfully");
  } catch (error) {
    console.error("❌ Failed to initialize database:", error.message);
    throw error;
  } finally {
    client.release();
  }
};

module.exports = { pool, initDatabase };
