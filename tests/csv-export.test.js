const request = require("supertest");
const app = require("../src/app");
const { pool } = require("../src/config/database");
const TokenService = require("../src/services/tokenService");

describe("CSV Export Tests", () => {
  let adminToken;
  let analystToken;

  beforeAll(async () => {
    // Clean up
    await pool.query("DELETE FROM refresh_tokens");
    await pool.query("DELETE FROM users");
    await pool.query("DELETE FROM profiles");

    // Create admin user
    const adminResult = await pool.query(
      `
      INSERT INTO users (github_id, username, email, role, is_active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
      `,
      ["csv_admin", "csvadmin", "csv@test.com", "admin", true],
    );
    adminToken = TokenService.generateAccessToken(
      adminResult.rows[0].id,
      "admin",
    );

    // Create analyst user
    const analystResult = await pool.query(
      `
      INSERT INTO users (github_id, username, email, role, is_active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
      `,
      ["csv_analyst", "csvanalyst", "csvanalyst@test.com", "analyst", true],
    );
    analystToken = TokenService.generateAccessToken(
      analystResult.rows[0].id,
      "analyst",
    );

    // Create test profiles
    await pool.query(`
      INSERT INTO profiles (name, gender, age, country_id, created_at)
      VALUES 
      ('export test 1', 'male', 25, 'NG', NOW()),
      ('export test 2', 'female', 30, 'KE', NOW()),
      ('export test 3', 'male', 35, 'GH', NOW())
    `);
  });

  describe("GET /api/profiles/export/csv", () => {
    it("should require authentication", async () => {
      const response = await request(app)
        .get("/api/profiles/export/csv")
        .set("X-API-Version", "1")
        .expect(401);

      expect(response.body.message).toBe("Authentication required");
    });

    it("should allow admin to export CSV", async () => {
      const response = await request(app)
        .get("/api/profiles/export/csv")
        .set("X-API-Version", "1")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      // Fix: Check that content-type includes text/csv (may have charset)
      expect(response.headers["content-type"]).toMatch(/text\/csv/);
      expect(response.headers["content-disposition"]).toContain("attachment");
      expect(response.text).toContain('"id","name","gender"');
    });

    it("should allow analyst to export CSV", async () => {
      const response = await request(app)
        .get("/api/profiles/export/csv")
        .set("X-API-Version", "1")
        .set("Authorization", `Bearer ${analystToken}`)
        .expect(200);

      // Fix: Check that content-type includes text/csv
      expect(response.headers["content-type"]).toMatch(/text\/csv/);
      expect(response.text).toContain("export test");
    });

    it("should respect gender filter in CSV export", async () => {
      const response = await request(app)
        .get("/api/profiles/export/csv?gender=male")
        .set("X-API-Version", "1")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.text).toContain("male");
      // Should not contain female profiles
      expect(response.text).not.toContain("female");
    });

    it("should respect country filter in CSV export", async () => {
      const response = await request(app)
        .get("/api/profiles/export/csv?country_id=NG")
        .set("X-API-Version", "1")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.text).toContain("NG");
    });

    it("should return 404 when no profiles to export", async () => {
      // Delete all profiles
      await pool.query("DELETE FROM profiles");

      const response = await request(app)
        .get("/api/profiles/export/csv")
        .set("X-API-Version", "1")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.message).toBe("No profiles found to export");
    });
  });

  afterAll(async () => {
    await pool.end();
    await new Promise((resolve) => setTimeout(resolve, 500));
  });
});
