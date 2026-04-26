const requiredEnvVars = [
    'JWT_SECRET',
    'GITHUB_CLIENT_ID',
    'GITHUB_CLIENT_SECRET',
    'DB_HOST',
    'DB_USER',
    'DB_NAME'
];

function validateEnv() {
    const missing = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    
    if (process.env.JWT_SECRET === 'your-super-secret-jwt-key-change-this') {
        console.warn('⚠️  WARNING: Using default JWT_SECRET. Change this in production!');
    }
}

module.exports = { validateEnv };