const { pool } = require('../config/database');

class User {
    static async createOrUpdate(githubUser) {
        const { id: github_id, login: username, email, avatar_url } = githubUser;
        
        const query = `
            INSERT INTO users (github_id, username, email, avatar_url, last_login_at)
            VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
            ON CONFLICT (github_id) 
            DO UPDATE SET 
                username = EXCLUDED.username,
                email = EXCLUDED.email,
                avatar_url = EXCLUDED.avatar_url,
                last_login_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `;
        
        const values = [github_id, username, email, avatar_url];
        const result = await pool.query(query, values);
        return result.rows[0];
    }
    
    static async findById(id) {
        const query = 'SELECT * FROM users WHERE id = $1';
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }
    
    static async findByGithubId(githubId) {
        const query = 'SELECT * FROM users WHERE github_id = $1';
        const result = await pool.query(query, [githubId]);
        return result.rows[0];
    }
    
    static async updateRole(userId, role) {
        const query = 'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *';
        const result = await pool.query(query, [role, userId]);
        return result.rows[0];
    }
    
    static async deactivate(userId) {
        const query = 'UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *';
        const result = await pool.query(query, [userId]);
        return result.rows[0];
    }
}

module.exports = User;