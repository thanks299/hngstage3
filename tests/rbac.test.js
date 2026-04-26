const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/database');
const TokenService = require('../src/services/tokenService');

describe('Role-Based Access Control (RBAC) Tests', () => {
    let adminToken;
    let analystToken;
    let inactiveUserToken;

    beforeAll(async () => {
        // Clean up
        await pool.query('DELETE FROM refresh_tokens');
        await pool.query('DELETE FROM users');

        // Create admin user
        const adminResult = await pool.query(`
            INSERT INTO users (github_id, username, email, role, is_active)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, role
        `, ['admin_github', 'admin', 'admin@test.com', 'admin', true]);
        adminToken = TokenService.generateAccessToken(adminResult.rows[0].id, 'admin');

        // Create analyst user
        const analystResult = await pool.query(`
            INSERT INTO users (github_id, username, email, role, is_active)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, role
        `, ['analyst_github', 'analyst', 'analyst@test.com', 'analyst', true]);
        analystToken = TokenService.generateAccessToken(analystResult.rows[0].id, 'analyst');

        // Create inactive user
        const inactiveResult = await pool.query(`
            INSERT INTO users (github_id, username, email, role, is_active)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, role
        `, ['inactive_github', 'inactive', 'inactive@test.com', 'analyst', false]);
        inactiveUserToken = TokenService.generateAccessToken(inactiveResult.rows[0].id, 'analyst');
    });

    afterAll(async () => {
        await pool.end();
    });

    describe('Admin Access Tests', () => {
        it('should allow admin to access GET /api/v1/profiles', async () => {
            const response = await request(app)
                .get('/api/v1/profiles')
                .set('X-API-Version', '1')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);
            
            expect(response.body.status).toBe('success');
        });

        it('should allow admin to create profile', async () => {
            const response = await request(app)
                .post('/api/v1/profiles')
                .set('X-API-Version', '1')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ name: 'Admin Created Profile' })
                .expect(201);
            
            expect(response.body.status).toBe('success');
        });

        it('should allow admin to delete profile', async () => {
            // Create a profile first
            const createResponse = await request(app)
                .post('/api/v1/profiles')
                .set('X-API-Version', '1')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ name: 'To Be Deleted' });
            
            const profileId = createResponse.body.data.id;

            // Delete it
            await request(app)
                .delete(`/api/v1/profiles/${profileId}`)
                .set('X-API-Version', '1')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(204);
        });
    });

    describe('Analyst Access Tests', () => {
        it('should allow analyst to access GET /api/v1/profiles', async () => {
            const response = await request(app)
                .get('/api/v1/profiles')
                .set('X-API-Version', '1')
                .set('Authorization', `Bearer ${analystToken}`)
                .expect(200);
            
            expect(response.body.status).toBe('success');
        });

        it('should allow analyst to search profiles', async () => {
            const response = await request(app)
                .get('/api/v1/profiles/search?q=male')
                .set('X-API-Version', '1')
                .set('Authorization', `Bearer ${analystToken}`)
                .expect(200);
            
            expect(response.body.status).toBe('success');
        });

        it('should allow analyst to export CSV', async () => {
            const response = await request(app)
                .get('/api/v1/profiles/export/csv')
                .set('X-API-Version', '1')
                .set('Authorization', `Bearer ${analystToken}`)
                .expect(200);
            
            expect(response.headers['content-type']).toBe('text/csv');
            expect(response.headers['content-disposition']).toContain('attachment');
        });

        it('should reject analyst trying to create profile', async () => {
            const response = await request(app)
                .post('/api/v1/profiles')
                .set('X-API-Version', '1')
                .set('Authorization', `Bearer ${analystToken}`)
                .send({ name: 'Analyst Creation Attempt' })
                .expect(403);
            
            expect(response.body.message).toContain('Insufficient permissions');
            expect(response.body.message).toContain('admin');
        });

        it('should reject analyst trying to delete profile', async () => {
            // Get existing profile
            const profilesResponse = await request(app)
                .get('/api/v1/profiles')
                .set('X-API-Version', '1')
                .set('Authorization', `Bearer ${analystToken}`);
            
            if (profilesResponse.body.data.length > 0) {
                const profileId = profilesResponse.body.data[0].id;
                
                const response = await request(app)
                    .delete(`/api/v1/profiles/${profileId}`)
                    .set('X-API-Version', '1')
                    .set('Authorization', `Bearer ${analystToken}`)
                    .expect(403);
                
                expect(response.body.message).toContain('Insufficient permissions');
            }
        });
    });

    describe('Inactive User Access Tests', () => {
        it('should reject inactive user from accessing any endpoint', async () => {
            const response = await request(app)
                .get('/api/v1/profiles')
                .set('X-API-Version', '1')
                .set('Authorization', `Bearer ${inactiveUserToken}`)
                .expect(403);
            
            expect(response.body.message).toBe('User account is inactive or does not exist');
        });
    });

    describe('Unauthenticated Access Tests', () => {
        it('should reject unauthenticated access to profiles', async () => {
            const response = await request(app)
                .get('/api/v1/profiles')
                .set('X-API-Version', '1')
                .expect(401);
            
            expect(response.body.message).toBe('Authentication required');
        });

        it('should reject unauthenticated access to search', async () => {
            const response = await request(app)
                .get('/api/v1/profiles/search?q=test')
                .set('X-API-Version', '1')
                .expect(401);
            
            expect(response.body.message).toBe('Authentication required');
        });

        it('should reject unauthenticated access to export', async () => {
            const response = await request(app)
                .get('/api/v1/profiles/export/csv')
                .set('X-API-Version', '1')
                .expect(401);
            
            expect(response.body.message).toBe('Authentication required');
        });
    });

    describe('Token Validation Tests', () => {
        it('should reject expired or invalid token', async () => {
            const invalidToken = Buffer.from('not-a-real-token').toString('base64');
            
            const response = await request(app)
                .get('/api/v1/profiles')
                .set('X-API-Version', '1')
                .set('Authorization', `Bearer ${invalidToken}`)
                .expect(401);
            
            expect(response.body.message).toBe('Invalid or expired token');
        });
    });
});