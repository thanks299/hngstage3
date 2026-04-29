const { pool, initDatabase } = require("../src/config/database");

async function migrate() {
  try {
    console.log("🔄 Starting migrations...");
    await initDatabase();
    console.log("✅ Migrations completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    process.exit(1);
  }
}

migrate();
