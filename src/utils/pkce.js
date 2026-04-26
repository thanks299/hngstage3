const crypto = require('node:crypto');

class PKCE {
    static generateCodeVerifier() {
        return crypto.randomBytes(32).toString('base64url');
    }
    
    static async generateCodeChallenge(codeVerifier) {
        const hash = crypto.createHash('sha256');
        hash.update(codeVerifier);
        return hash.digest('base64url');
    }
    
    static generateState() {
        return crypto.randomBytes(16).toString('hex');
    }
}

module.exports = PKCE;