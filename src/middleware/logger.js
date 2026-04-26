function requestLogger(req, res, next) {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logEntry = {
            method: req.method,
            endpoint: req.originalUrl,
            statusCode: res.statusCode,
            responseTime: `${duration}ms`,
            ip: req.ip,
            userAgent: req.get('user-agent'),
            timestamp: new Date().toISOString()
        };
        
        console.log(JSON.stringify(logEntry));
        
        // In production, you'd send this to a logging service
        if (process.env.NODE_ENV === 'production') {
            // Send to logging service (e.g., Datadog, Logtail, etc.)
        }
    });
    
    next();
}

module.exports = { requestLogger };