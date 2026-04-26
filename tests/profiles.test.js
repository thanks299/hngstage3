const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/database');
const TokenService = require('../src/services/tokenService');
const User = require('../src/models/User');

describe('Profile API Tests', () => {
    let adminToken;
    let analystToken;
    let adminUser;
    let analystUser;

    beforeAll(async () => {
        // Clean up
        await pool.query('DELETE FROM refresh_tokens');
        await pool.query('DELETE FROM users');
        await pool.query('DELETE FROM profiles');

        // Create admin user
        const adminResult = await pool.query(`
            INSERT INTO users (github_id, username, email, role, is_active)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, ['github_admin', 'adminuser', 'admin@test.com', 'admin', true]);
        adminUser = adminResult.rows[0];
        adminToken = TokenService.generateAccessToken(adminUser.id, adminUser.role);

        // Create analyst user
        const analystResult = await pool.query(`
            INSERT INTO users (github_id, username, email, role, is_active)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, ['github_analyst', 'analystuser', 'analyst@test.com', 'analyst', true]);
        analystUser = analystResult.rows[0];
        analystToken = TokenService.generateAccessToken(analystUser.id, analystUser.role);
    });

    afterAll(async () => {
        await pool.end();
    });

    describe('API Versioning', () => {
        it('should reject requests without X-API-Version header', async () => {
            const response = await request(app)
                .get('/api/v1/profiles')
                .expect(400);
            
            expect(response.body.message).toBe('API version header required');
        });
    });

    describe('GET /api/v1/profiles', () => {
        it('should require authentication', async () => {
            const response = await request(app)
                .get('/api/v1/profiles')
                .set('X-API-Version', '1')
                .expect(401);
            
            expect(response.body.message).toBe('Authentication required');
        });

        it('should allow authenticated admin to access', async () => {
            const response = await request(app)
                .get('/api/v1/profiles')
                .set('X-API-Version', '1')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);
            
            expect(response.body).toHaveProperty('status', 'success');
            expect(response.body).toHaveProperty('data');
            expect(response.body).toHaveProperty('page');
            expect(response.body).toHaveProperty('limit');
            expect(response.body).toHaveProperty('total');
            expect(response.body).toHaveProperty('total_pages');
            expect(response.body).toHaveProperty('links');
        });

        it('should allow authenticated analyst to access', async () => {
            const response = await request(app)
                .get('/api/v1/profiles')
                .set('X-API-Version', '1')
                .set('Authorization', `Bearer ${analystToken}`)
                .expect(200);
            
            expect(response.body).toHaveProperty('status', 'success');
        });

        it('should support pagination', async () => {
            const response = await request(app)
                .get('/api/v1/profiles?page=2&limit=5')
                .set('X-API-Version', '1')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);
            
            expect(response.body.page).toBe(2);
            expect(response.body.limit).toBe(5);
            expect(response.body.links).toHaveProperty('self');
        });
    });

    describe('POST /api/v1/profiles', () => {
        it('should allow admin to create profile', async () => {
            const response = await request(app)
                .post('/api/v1/profiles')
                .set('X-API-Version', '1')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ name: 'Michael Jordan' })
                .expect(201);
            
            expect(response.body.status).toBe('success');
            expect(response.body.data).toHaveProperty('name', 'michael jordan');
        });

        it('should reject analyst trying to create profile', async () => {
            const response = await request(app)
                .post('/api/v1/profiles')
                .set('X-API-Version', '1')
                .set('Authorization', `Bearer ${analystToken}`)
                .send({ name: 'Test Name' })
                .expect(403);
            
            expect(response.body.message).toContain('Insufficient permissions');
        });

        it('should return 400 for missing name', async () => {
            const response = await request(app)
                .post('/api/v1/profiles')
                .set('X-API-Version', '1')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({})
                .expect(400);
            
            expect(response.body.message).toBe('Name is required');
        });
    });

    describe('GET /api/v1/profiles/:id', () => {
        let profileId;

        beforeAll(async () => {
            // Create a test profile
            const result = await pool.query(`
                INSERT INTO profiles (name, gender, age, country_id)
                VALUES ($1, $2, $3, $4)
                RETURNING id
            `, ['test_user', 'male', 25, 'NG']);
            profileId = result.rows[0].id;
        });

        it('should allow authenticated user to get profile by id', async () => {
            const response = await request(app)
                .get(`/api/v1/profiles/${profileId}`)
                .set('X-API-Version', '1')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);
            
            expect(response.body.status).toBe('success');
            expect(response.body.data).toHaveProperty('id', profileId);
        });

        it('should return 404 for non-existent profile', async () => {
            const response = await request(app)
                .get('/api/v1/profiles/00000000-0000-0000-0000-000000000000')
                .set('X-API-Version', '1')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(404);
            
            expect(response.body.message).toBe('Profile not found');
        });
    });

    describe('DELETE /api/v1/profiles/:id', () => {
        let profileToDelete;

        beforeAll(async () => {
            const result = await pool.query(`
                INSERT INTO profiles (name, gender, age)
                VALUES ($1, $2, $3)
                RETURNING id
            `, ['delete_me', 'female', 30]);
            profileToDelete = result.rows[0].id;
        });

        it('should allow admin to delete profile', async () => {
            await request(app)
                .delete(`/api/v1/profiles/${profileToDelete}`)
                .set('X-API-Version', '1')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(204);
        });

        it('should reject analyst trying to delete profile', async () => {
            const response = await request(app)
                .delete(`/api/v1/profiles/${profileToDelete}`)
                .set('X-API-Version', '1')
                .set('Authorization', `Bearer ${analystToken}`)
                .expect(403);
            
            expect(response.body.message).toContain('Insufficient permissions');
        });
    });

    describe('GET /api/v1/profiles/search', () => {
        beforeAll(async () => {
            await pool.query(`
                INSERT INTO profiles (name, gender, age, age_group, country_id)
                VALUES 
                ('young male test', 'male', 20, 'adult', 'NG'),
                ('young female test', 'female', 22, 'adult', 'KE'),
                ('old male test', 'male', 65, 'senior', 'ZA')
            `);
        });

        it('should search profiles with natural language', async () => {
            const response = await request(app)
                .get('/api/v1/profiles/search?q=young males')
                .set('X-API-Version', '1')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);
            
            expect(response.body.status).toBe('success');
            expect(response.body.data).toBeInstanceOf(Array);
        });

        it('should return 400 for empty search query', async () => {
            const response = await request(app)
                .get('/api/v1/profiles/search')
                .set('X-API-Version', '1')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(400);
            
            expect(response.body.message).toBe('Search query required');
        });
    });
});