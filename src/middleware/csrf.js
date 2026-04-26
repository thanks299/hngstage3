const csrf = require('csrf');

const tokens = new csrf();

function generateCsrfToken(req, res, next) {
    const secret = tokens.secretSync();
    const token = tokens.create(secret);
    
    req.csrfSecret = secret;
    res.cookie('csrf-secret', secret, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    });
    res.locals.csrfToken = token;
    next();
}

function validateCsrfToken(req, res, next) {
    const secret = req.cookies['csrf-secret'];
    const token = req.headers['x-csrf-token'] || req.body._csrf;
    
    if (!secret || !token || !tokens.verify(secret, token)) {
        return res.status(403).json({
            status: 'error',
            message: 'Invalid CSRF token'
        });
    }
    
    next();
}

module.exports = { generateCsrfToken, validateCsrfToken };