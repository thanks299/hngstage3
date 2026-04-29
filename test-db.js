const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://insighta_user:2YJEepORGScE5LxsnnIaTnvJcC760K57@oregon-postgres.render.com:5432/insighta_labs',
  ssl: { rejectUnauthorized: false },
});

async function test() {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM users');
    console.log('✅ Connected! Users count:', result.rows[0].count);
  } catch (err) {
    console.error('❌ Failed:', err.message);
  } finally {
    await pool.end();
  }
}

test();
