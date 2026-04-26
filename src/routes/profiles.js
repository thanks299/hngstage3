const express = require('express');
const router = express.Router();

// Redirect to versioned API
router.use('/', (req, res, next) => {
    if (!req.headers['x-api-version']) {
        return res.status(400).json({
            status: 'error',
            message: 'API version header required. Please use X-API-Version: 1'
        });
    }
    next();
}, require('./v1/profiles'));

module.exports = router;