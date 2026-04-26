const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
    console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
    console.error('Unexpected database error:', err);
});

// Initialize database tables (for Stage 2 compatibility)
const initDatabase = async () => {
    const client = await pool.connect();
    try {
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
        
        console.log('✅ Database tables initialized');
    } catch (error) {
        console.error('❌ Failed to initialize database:', error.message);
        throw error;
    } finally {
        client.release();
    }
};

module.exports = { pool, initDatabase };