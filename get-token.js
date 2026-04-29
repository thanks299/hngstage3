const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function getToken() {
  try {
    const result = await pool.query("SELECT id, username, role FROM users WHERE role = 'admin' LIMIT 1");
    
    let user;
    if (result.rows.length === 0) {
      console.log('No admin user found. Creating one...');
      const insertResult = await pool.query(`
        INSERT INTO users (github_id, username, email, role, is_active)
        VALUES ('test_user', 'testadmin', 'test@test.com', 'admin', true)
        RETURNING id, username, role
      `);
      user = insertResult.rows[0];
    } else {
      user = result.rows[0];
    }
    
    const token = jwt.sign(
      { userId: user.id, role: user.role, type: 'access' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    console.log('\n✅ TOKEN:\n', token);
    console.log('\n📝 User:', user.username);
    console.log('👑 Role:', user.role);
    console.log('\n🔧 Test command:');
    console.log(`curl -H "X-API-Version: 1" -H "Authorization: Bearer ${token}" https://hngstage3.onrender.com/api/profiles?limit=5\n`);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

getToken();
