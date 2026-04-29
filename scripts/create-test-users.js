/**
 * Create test users for grading
 * Run: node scripts/create-test-users.js
 */

require("dotenv").config();
const { pool, initDatabase } = require("../src/config/database");
const TokenService = require("../src/services/tokenService");

async function main() {
  try {
    console.log("📋 Initializing database...");
    await initDatabase();

    console.log("👤 Creating test users...");

    // Create admin test user (for test_code flow)
    const adminResult = await pool.query(
      `INSERT INTO users (github_id, username, email, role, is_active)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (github_id) DO UPDATE SET is_active = true
       RETURNING id, username, role`,
      ["test_admin_github_id", "test_admin", "admin@test.com", "admin", true],
    );
    const adminUser = adminResult.rows[0];
    console.log("✅ Admin user:", adminUser.username);

    // Create analyst test user
    const analystResult = await pool.query(
      `INSERT INTO users (github_id, username, email, role, is_active)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (github_id) DO UPDATE SET is_active = true
       RETURNING id, username, role`,
      [
        "test_analyst_github_id",
        "test_analyst",
        "analyst@test.com",
        "analyst",
        true,
      ],
    );
    const analystUser = analystResult.rows[0];
    console.log("✅ Analyst user:", analystUser.username);

    // Generate tokens for manual testing (if needed)
    const adminToken = TokenService.generateAccessToken(adminUser.id, "admin");
    const analystToken = TokenService.generateAccessToken(
      analystUser.id,
      "analyst",
    );

    console.log("\n🎫 Test Tokens (for manual testing):");
    console.log("Admin Token:", adminToken);
    console.log("Analyst Token:", analystToken);

    console.log("\n✅ Test users created successfully!");
    console.log(
      "You can use test_code at /auth/github/callback to get tokens for the admin user",
    );

    await pool.end();
  } catch (error) {
    console.error("❌ Error creating test users:", error.message);
    process.exit(1);
  }
}

main();
