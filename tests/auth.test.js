const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/database');
const User = require('../src/models/User');
const RefreshToken = require('../src/models/RefreshToken');

describe('Authentication Tests', () => {
    beforeAll(async () => {
        // Clean up test data
        await pool.query('DELETE FROM refresh_tokens');
        await pool.query('DELETE FROM users');
    });

    afterAll(async () => {
        await pool.end();
    });

    describe('GET /auth/github', () => {
        it('should return GitHub OAuth URL', async () => {
            const response = await request(app)
                .get('/auth/github')
                .expect(200);
            
            expect(response.body).toHaveProperty('url');
            expect(response.body.url).toContain('github.com/login/oauth/authorize');
        });
    });

    describe('POST /auth/refresh', () => {
        it('should return 400 if no refresh token provided', async () => {
            const response = await request(app)
                .post('/auth/refresh')
                .send({})
                .expect(400);
            
            expect(response.body.message).toBe('Refresh token required');
        });

        it('should return 401 if refresh token is invalid', async () => {
            const response = await request(app)
                .post('/auth/refresh')
                .send({ refresh_token: 'invalid_token' })
                .expect(401);
            
            expect(response.body.message).toBe('Invalid refresh token');
        });
    });

    describe('POST /auth/logout', () => {
        it('should logout successfully', async () => {
            const response = await request(app)
                .post('/auth/logout')
                .send({})
                .expect(200);
            
            expect(response.body.message).toBe('Logged out successfully');
        });
    });
});