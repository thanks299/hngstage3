const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: Number.parseInt(process.env.AUTH_RATE_LIMIT) || 10,
    message: {
        status: 'error',
        message: 'Too many authentication attempts. Please try again later.'
    },
    keyGenerator: (req) => req.ip,
    standardHeaders: true,
    legacyHeaders: false,
});

const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: Number.parseInt(process.env.API_RATE_LIMIT) || 60,
    message: {
        status: 'error',
        message: 'Rate limit exceeded. Please slow down your requests.'
    },
    keyGenerator: (req) => req.user?.id || req.ip,
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = { authLimiter, apiLimiter };