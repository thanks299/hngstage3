const TokenService = require('../services/tokenService');
const User = require('../models/User');

async function authenticate(req, res, next) {
    try {
        let token;
        
        // Check for token in multiple places
        if (req.headers.authorization?.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        } else if (req.cookies?.access_token) {
            token = req.cookies.access_token;
        }
        
        if (!token) {
            return res.status(401).json({
                status: 'error',
                message: 'Authentication required'
            });
        }
        
        const decoded = TokenService.verifyAccessToken(token);
        if (!decoded) {
            return res.status(401).json({
                status: 'error',
                message: 'Invalid or expired token'
            });
        }
        
        const user = await User.findById(decoded.userId);
        if (!user?.is_active) {
            return res.status(403).json({
                status: 'error',
                message: 'User account is inactive or does not exist'
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