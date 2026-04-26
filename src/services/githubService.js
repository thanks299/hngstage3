const axios = require('axios');

class GitHubService {
    static async exchangeCode(code, clientId, clientSecret) {
        const response = await axios.post('https://github.com/login/oauth/access_token', {
            client_id: clientId,
            client_secret: clientSecret,
            code: code
        }, {
            headers: { Accept: 'application/json' }
        });
        
        return response.data;
    }
    
    static async getUser(accessToken) {
        const response = await axios.get('https://api.github.com/user', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/json'
            }
        });
        
        return response.data;
    }
    
    static async getEmails(accessToken) {
        const response = await axios.get('https://api.github.com/user/emails', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/json'
            }
        });
        
        const primaryEmail = response.data.find(email => email.primary);
        return primaryEmail ? primaryEmail.email : null;
    }
}

module.exports = GitHubService;