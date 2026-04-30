/**
 * Utility functions for tests
 * Handles database setup, cleanup, and common test operations
 */

const { pool } = require("../src/config/database");

/**
 * Setup test database - clean up tables before tests
 */
async function setupTestDatabase() {
  try {
    await pool.query("DELETE FROM refresh_tokens");
    await pool.query("DELETE FROM users");
    await pool.query("DELETE FROM profiles");
  } catch (err) {
    console.error("Test setup error:", err.message);
    throw err;
  }
}

/**
 * Cleanup after tests - end pool connection
 */
async function cleanupTestDatabase() {
  try {
    if (pool && !pool.ended) {
      await pool.end();
    }
  } catch {
    // Ignore if already closed
  }

  // Give time for pending operations
  await new Promise((resolve) => setTimeout(resolve, 100));
}

/**
 * Get a test database client
 */
async function getTestClient() {
  return await pool.connect();
}

module.exports = {
  setupTestDatabase,
  cleanupTestDatabase,
  getTestClient,
  pool,
};
