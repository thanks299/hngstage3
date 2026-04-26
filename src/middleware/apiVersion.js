function requireApiVersion(version = '1') {
    return (req, res, next) => {
        const apiVersion = req.headers['x-api-version'];
        
        if (!apiVersion) {
            return res.status(400).json({
                status: 'error',
                message: 'API version header required (X-API-Version: 1)'
            });
        }
        
        if (apiVersion !== version) {
            return res.status(400).json({
                status: 'error',
                message: `Unsupported API version. Expected version ${version}`
            });
        }
        
        next();
    };
}

module.exports = { requireApiVersion };