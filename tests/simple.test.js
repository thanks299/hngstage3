const request = require("supertest");
const app = require("../src/app");

describe("Simple API Tests", () => {
  test("Health check should return 200", async () => {
    const response = await request(app).get("/health").expect(200);

    expect(response.body).toHaveProperty("status", "ok");
  });

  test("Auth endpoint should return GitHub URL", async () => {
    const response = await request(app).get("/auth/github").expect(200);

    expect(response.body).toHaveProperty("url");
    expect(response.body.url).toContain("github.com");
  });

  test("API version header is required", async () => {
    const response = await request(app).get("/api/profiles").expect(400);

    expect(response.body.message).toContain("API version header required");
  });

  test("Wrong API version should be rejected", async () => {
    const response = await request(app)
      .get("/api/profiles")
      .set("X-API-Version", "2")
      .expect(400);

    expect(response.body.message).toContain("Unsupported API version");
  });

  test("Authentication required for API", async () => {
    const response = await request(app)
      .get("/api/profiles")
      .set("X-API-Version", "1")
      .expect(401);

    expect(response.body.message).toBe("Authentication required");
  });
});
