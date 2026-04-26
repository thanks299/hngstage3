const jwt = require('jsonwebtoken');
const crypto = require('node:crypto');

class TokenService {
    static generateAccessToken(userId, role) {
        return jwt.sign(
            { userId, role, type: 'access' },
            process.env.JWT_SECRET,
            { expiresIn: Number.parseInt(process.env.JWT_ACCESS_EXPIRY) }
        );
    }
    
    static generateRefreshToken() {
        return crypto.randomBytes(64).toString('hex');
    }
    
    static verifyAccessToken(token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            if (decoded.type !== 'access') throw new Error('Invalid token type');
            return decoded;
        } catch (error) {
            if (
                error instanceof jwt.JsonWebTokenError ||
                error instanceof jwt.TokenExpiredError ||
                error instanceof jwt.NotBeforeError ||
                error.message === 'Invalid token type'
            ) {
                return null;
            }

            throw error;
        }
    }
    
    static calculateExpiry(minutes) {
        return new Date(Date.now() + minutes * 60 * 1000);
    }
}

module.exports = TokenService;