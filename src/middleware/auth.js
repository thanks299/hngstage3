const { pool } = require('../config/database');
const jwt = require('jsonwebtoken');

async function authenticate(req, res, next) {
    try {
        // Get token from Authorization header or cookie
        let token = req.headers.authorization?.split(' ')[1];
        if (!token && req.cookies?.access_token) {
            token = req.cookies.access_token;
        }
        
        if (!token) {
            return res.status(401).json({ 
                status: 'error', 
                message: 'Authentication required' 
            });
        }
        
        // Verify token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ 
                    status: 'error', 
                    message: 'Token expired' 
                });
            }
            return res.status(401).json({ 
                status: 'error', 
                message: 'Invalid token' 
            });
        }
        
        if (decoded.type !== 'access') {
            return res.status(401).json({ 
                status: 'error', 
                message: 'Invalid token type' 
            });
        }
        
        // Get user from database
        const userResult = await pool.query(
            'SELECT id, username, email, role, is_active FROM users WHERE id = $1',
            [decoded.userId]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(401).json({ 
                status: 'error', 
                message: 'User not found' 
            });
        }
        
        const user = userResult.rows[0];
        
        if (!user.is_active) {
            return res.status(403).json({ 
                status: 'error', 
                message: 'Account is deactivated' 
            });
        }
        
        req.user = user;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Internal server error' 
        });
    }
}

module.exports = { authenticate };