const jwt = require("jsonwebtoken");
const { pool } = require("../src/config/database");
require("dotenv").config();

async function generateTestTokens() {
  try {
    // Get admin user
    const adminResult = await pool.query(
      "SELECT id, username, role FROM users WHERE role = 'admin' LIMIT 1",
    );

    if (adminResult.rows.length === 0) {
      console.log("❌ No admin user found. Please create one first.");
      process.exit(1);
    }

    const admin = adminResult.rows[0];

    // Generate admin token
    const adminToken = jwt.sign(
      { userId: admin.id, role: admin.role, type: "access" },
      process.env.JWT_SECRET,
      { expiresIn: Number.parseInt(process.env.JWT_ACCESS_EXPIRY) },
    );

    // Get analyst user
    const analystResult = await pool.query(
      "SELECT id, username, role FROM users WHERE role = 'analyst' LIMIT 1",
    );

    console.log("\n✅ TEST TOKENS GENERATED\n");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("👑 ADMIN TOKEN:");
    console.log(adminToken);
    console.log("\n📋 ANALYST TOKEN:");
    if (analystResult.rows.length > 0) {
      const analyst = analystResult.rows[0];
      const analystToken = jwt.sign(
        { userId: analyst.id, role: analyst.role, type: "access" },
        process.env.JWT_SECRET,
        { expiresIn: Number.parseInt(process.env.JWT_ACCESS_EXPIRY) },
      );
      console.log(analystToken);
    } else {
      console.log("No analyst user found");
    }
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    await pool.end();
  } catch (error) {
    console.error("Error:", error.message);
  }
}

generateTestTokens();
