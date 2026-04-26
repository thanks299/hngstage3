const { pool } = require('../config/database');

class RefreshToken {
    static async create(userId, token, expiresAt) {
        const query = `
            INSERT INTO refresh_tokens (user_id, token, expires_at)
            VALUES ($1, $2, $3)
            RETURNING *
        `;
        const values = [userId, token, expiresAt];
        const result = await pool.query(query, values);
        return result.rows[0];
    }
    
    static async findByToken(token) {
        const query = 'SELECT * FROM refresh_tokens WHERE token = $1 AND revoked_at IS NULL';
        const result = await pool.query(query, [token]);
        return result.rows[0];
    }
    
    static async revoke(token) {
        const query = 'UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE token = $1 RETURNING *';
        const result = await pool.query(query, [token]);
        return result.rows[0];
    }
    
    static async revokeAllUserTokens(userId) {
        const query = 'UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = $1';
        await pool.query(query, [userId]);
    }
    
    static async cleanupExpired() {
        const query = 'UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE expires_at < NOW()';
        await pool.query(query);
    }
}

module.exports = RefreshToken;