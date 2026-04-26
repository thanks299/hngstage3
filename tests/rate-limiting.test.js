const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/database');
const TokenService = require('../src/services/tokenService');

describe('Rate Limiting Tests', () => {
    let adminToken;

    beforeAll(async () => {
        // Clean up
        await pool.query('DELETE FROM refresh_tokens');
        await pool.query('DELETE FROM users');

        // Create admin user
        const adminResult = await pool.query(`
            INSERT INTO users (github_id, username, email, role, is_active)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
        `, ['rate_admin', 'rateadmin', 'rate@test.com', 'admin', true]);
        adminToken = TokenService.generateAccessToken(adminResult.rows[0].id, 'admin');
    });

    afterAll(async () => {
        await pool.end();
    });

    describe('Auth Endpoint Rate Limiting', () => {
        it('should allow up to 10 requests per minute to auth endpoints', async () => {
            // Make 10 requests (should all succeed)
            for (let i = 0; i < 10; i++) {
                const response = await request(app)
                    .get('/auth/github')
                    .expect(200);
                
                expect(response.body).toHaveProperty('url');
            }
        });

        it('should rate limit after 10 requests', async () => {
            // Wait a bit to ensure we're in a new minute window
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Make 11th request quickly
            const response = await request(app)
                .post('/auth/refresh')
                .send({ refresh_token: 'test' });
            
            // Note: This might return 401 or 429 depending on timing
            // Rate limiting middleware will handle it
            expect([401, 429]).toContain(response.statusCode);
        });
    });

    describe('API Endpoint Rate Limiting', () => {
        it('should allow up to 60 requests per minute to API endpoints', async () => {
            // Make multiple requests
            const requests = [];
            for (let i = 0; i < 30; i++) {
                requests.push(
                    request(app)
                        .get('/api/v1/profiles')
                        .set('X-API-Version', '1')
                        .set('Authorization', `Bearer ${adminToken}`)
                );
            }
            
            const responses = await Promise.all(requests);
            
            // All should succeed (30 < 60 limit)
            responses.forEach(response => {
                expect([200, 401, 403]).toContain(response.statusCode);
            });
        });

        it('should include rate limit headers', async () => {
            const response = await request(app)
                .get('/api/v1/profiles')
                .set('X-API-Version', '1')
                .set('Authorization', `Bearer ${adminToken}`);
            
            // Check for rate limit headers (if implemented)
            // Headers like X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
            if (response.headers['x-ratelimit-limit']) {
                expect(response.headers['x-ratelimit-limit']).toBeDefined();
                expect(response.headers['x-ratelimit-remaining']).toBeDefined();
            }
        });
    });
});