require("dotenv").config();

const requiredEnvVars = [
  "JWT_SECRET",
  "GITHUB_CLIENT_ID",
  "GITHUB_CLIENT_SECRET",
];

function validateEnv() {
  const missing = requiredEnvVars.filter((varName) => !process.env[varName]);

  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
  const hasLegacyDatabaseVars =
    process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME;

  if (!hasDatabaseUrl && !hasLegacyDatabaseVars) {
    missing.unshift("DATABASE_URL or DB_HOST, DB_USER, DB_NAME");
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }

  // Validate DATABASE_URL format when present
  if (hasDatabaseUrl && !process.env.DATABASE_URL.startsWith("postgresql://")) {
    throw new Error("DATABASE_URL must start with postgresql://");
  }

  console.log("✅ Environment variables validated");
  console.log(`📡 NODE_ENV: ${process.env.NODE_ENV || "development"}`);
  console.log(`📡 Using DATABASE_URL: ${hasDatabaseUrl ? "Yes" : "No"}`);
}

module.exports = { validateEnv };
