const app = require('./src/app');
const { pool, initDatabase } = require('./src/config/database');
require('dotenv').config();

const PORT = process.env.PORT || 3000;

let retryCount = 0;
const maxRetries = 5;

// Function to create auth-related tables
const initAuthTables = async (client) => {
    try {
        // Create users table
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                github_id VARCHAR(255) UNIQUE NOT NULL,
                username VARCHAR(255) NOT NULL,
                email VARCHAR(255),
                avatar_url TEXT,
                role VARCHAR(50) DEFAULT 'analyst' CHECK (role IN ('admin', 'analyst')),
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
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                token VARCHAR(500) NOT NULL UNIQUE,
                expires_at TIMESTAMP NOT NULL,
                revoked_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
            CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
        `);
        
        console.log('✅ Auth tables initialized');
    } catch (error) {
        console.error('❌ Failed to initialize auth tables:', error.message);
        throw error;
    }
};

const startDegradedServer = (message) => {
    console.log('\n⚠️ Could not fully initialize the database. Starting server in degraded mode...');
    
    if (message) {
        console.log(message);
    }
    
    app.listen(PORT, () => {
        console.log(`⚠️ Server running but database features are unavailable`);
        console.log(`📍 URL: http://localhost:${PORT}`);
        console.log(`📌 Check http://localhost:${PORT}/health for DB status\n`);
    });
};

const startServer = async () => {
    app.locals.dbReady = false;
    
    try {
        // Test database connection
        await pool.query('SELECT NOW()');
        console.log('✅ Database connected successfully');
        
        // Initialize tables
        const client = await pool.connect();
        try {
            await initDatabase(); // Stage 2 tables (profiles)
            await initAuthTables(client); // Stage 3 tables (users, refresh_tokens)
            app.locals.dbReady = true;
            console.log('✅ All tables initialized successfully');
        } finally {
            client.release();
        }
        
        app.listen(PORT, () => {
            console.log(`\n🚀 Insighta Labs+ Server is running!`);
            console.log(`📍 URL: http://localhost:${PORT}`);
            console.log(`🔐 Auth: http://localhost:${PORT}/auth/github`);
            console.log(`📊 API: http://localhost:${PORT}/api/profiles`);
            console.log(`🔍 Search: http://localhost:${PORT}/api/profiles/search?q=young males`);
            console.log(`❤️ Health: http://localhost:${PORT}/health\n`);
        });
    } catch (error) {
        app.locals.dbReady = false;
        
        const permissionDenied = error?.code === '42501' || /permission denied for schema public/i.test(error?.message || '');
        
        if (permissionDenied) {
            console.error('❌ Database initialization failed: permission denied for schema public');
            console.log('💡 Fix with a PostgreSQL superuser or database owner:');
            console.log(`   GRANT USAGE, CREATE ON SCHEMA public TO ${process.env.DB_USER};`);
            startDegradedServer();
            return;
        }
        
        console.error(`❌ Database connection failed (attempt ${retryCount + 1}/${maxRetries}):`, error.message);
        
        if (retryCount < maxRetries) {
            retryCount++;
            console.log(`🔄 Retrying in 3 seconds...`);
            setTimeout(startServer, 3000);
        } else {
            startDegradedServer('💡 To fix: verify PostgreSQL is running and check DB credentials/permissions.');
        }
    }
};

startServer();