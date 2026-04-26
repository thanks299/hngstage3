const jwt = require('jsonwebtoken');
const { pool } = require('../src/config/database');
require('dotenv').config();

async function getToken() {
    const client = await pool.connect();
    try {
        // Get first active user
        const result = await client.query(`
            SELECT id, username, role FROM users WHERE is_active = true LIMIT 1
        `);
        
        if (result.rows.length === 0) {
            console.log('❌ No users found. Create a user first:');
            console.log('sudo -u postgres psql -d insighta_labs -c "INSERT INTO users (github_id, username, email, role, is_active) VALUES (\'test\', \'testuser\', \'test@test.com\', \'admin\', true)"');
            return;
        }
        
        const user = result.rows[0];
        
        // Generate token
        const token = jwt.sign(
            { userId: user.id, role: user.role, type: 'access' },
            process.env.JWT_SECRET,
            { expiresIn: Number.parseInt(process.env.JWT_ACCESS_EXPIRY) }
        );
        
        console.log('\n✅ TOKEN GENERATED SUCCESSFULLY\n');
        console.log('User:', user.username);
        console.log('Role:', user.role);
        console.log('User ID:', user.id);
        console.log('\n🔑 ACCESS TOKEN:');
        console.log(token);
        console.log('\n📝 TEST COMMANDS:');
        console.log(`\n# Get all profiles:`);
        console.log(`curl -H "X-API-Version: 1" -H "Authorization: Bearer ${token}" http://localhost:3000/api/profiles/`);
        console.log(`\n# Create a profile:`);
        console.log(`curl -X POST http://localhost:3000/api/profiles/ -H "X-API-Version: 1" -H "Authorization: Bearer ${token}" -H "Content-Type: application/json" -d '{"name": "Michael Jackson"}'`);
        console.log(`\n# Search profiles:`);
        console.log(`curl -H "X-API-Version: 1" -H "Authorization: Bearer ${token}" "http://localhost:3000/api/profiles/search?q=young males"`);
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

getToken();