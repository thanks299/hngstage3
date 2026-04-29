/**
 * Seed script — run once:  node scripts/seed.js
 * Re-running is safe: ON CONFLICT (name) DO NOTHING
 *
 * Usage:
 *   node scripts/seed.js                        # reads from scripts/profiles.json
 *   node scripts/seed.js path/to/profiles.json  # custom path
 */

require("dotenv").config();
const fs = require("node:fs");
const path = require("node:path");
const { pool, initDatabase } = require("../src/config/database");
const Profile = require("../src/models/Profile");

const filePath = process.argv[2] || path.join(__dirname, "profiles.json");

function normalizeProfilesSeed(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && Array.isArray(payload.profiles)) {
    return payload.profiles;
  }

  if (payload && Array.isArray(payload.data)) {
    return payload.data;
  }

  return [payload];
}

async function main() {
  if (!fs.existsSync(filePath)) {
    console.error(`Seed file not found: ${filePath}`);
    console.error(
      "Download the profiles JSON and place it at scripts/profiles.json",
    );
    process.exit(1);
  }

  console.log(`Reading seed data from ${filePath}...`);
  const raw = fs.readFileSync(filePath, "utf8");
  let profiles;
  try {
    profiles = normalizeProfilesSeed(JSON.parse(raw));
  } catch (e) {
    console.error("Failed to parse JSON:", e.message);
    process.exit(1);
  }

  console.log(`Found ${profiles.length} profiles. Initializing database...`);
  await initDatabase();

  console.log("Seeding profiles...");
  await Profile.seedProfiles(profiles);
  console.log("Seed complete.");
  await pool.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
