function requireApiVersion(version = '1') {
    return (req, res, next) => {
        const apiVersion = req.headers['x-api-version'];
        
        console.log(`[API VERSION] Header: ${apiVersion}, Expected: ${version}`);
        
        if (!apiVersion) {
            return res.status(400).json({
                status: 'error',
                message: 'API version header required. Please use X-API-Version: 1'
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