const GitHubService = require('../services/githubService');
const TokenService = require('../services/tokenService');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');

class AuthController {
    static async githubCallback(req, res) {
        try {
            const { code } = req.query;
            
            if (!code) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Authorization code required'
                });
            }
            
            // Exchange code for access token
            const tokenData = await GitHubService.exchangeCode(
                code,
                process.env.GITHUB_CLIENT_ID,
                process.env.GITHUB_CLIENT_SECRET
            );
            
            if (!tokenData.access_token) {
                throw new Error('Failed to get access token');
            }
            
            // Get user data from GitHub
            const githubUser = await GitHubService.getUser(tokenData.access_token);
            const email = await GitHubService.getEmails(tokenData.access_token);
            githubUser.email = email;
            
            // Create or update user
            const user = await User.createOrUpdate(githubUser);
            
            if (!user.is_active) {
                return res.status(403).json({
                    status: 'error',
                    message: 'Account is deactivated. Contact administrator.'
                });
            }
            
            // Generate tokens
            const accessToken = TokenService.generateAccessToken(user.id, user.role);
            const refreshToken = TokenService.generateRefreshToken();
            const expiresAt = TokenService.calculateExpiry(
                Number.parseInt(process.env.JWT_REFRESH_EXPIRY) / 60
            );
            
            await RefreshToken.create(user.id, refreshToken, expiresAt);
            
            // Check if request is from CLI or Web
            const isCLI = req.query.is_cli === 'true';
            
            if (isCLI) {
                // Return JSON for CLI
                return res.json({
                    status: 'success',
                    access_token: accessToken,
                    refresh_token: refreshToken,
                    user: {
                        id: user.id,
                        username: user.username,
                        role: user.role
                    }
                });
            } else {
                // Set HTTP-only cookies for web
                res.cookie('access_token', accessToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'strict',
                    maxAge: Number.parseInt(process.env.JWT_ACCESS_EXPIRY) * 1000
                });
                
                res.cookie('refresh_token', refreshToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'strict',
                    maxAge: Number.parseInt(process.env.JWT_REFRESH_EXPIRY) * 1000
                });
                
                // Redirect to web portal
                res.redirect(`${process.env.WEB_PORTAL_URL}/dashboard`);
            }
        } catch (error) {
            console.error('GitHub callback error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Authentication failed'
            });
        }
    }
    
    static async refreshToken(req, res) {
        try {
            const { refresh_token } = req.body;
            
            if (!refresh_token) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Refresh token required'
                });
            }
            
            const tokenRecord = await RefreshToken.findByToken(refresh_token);
            
            if (!tokenRecord) {
                return res.status(401).json({
                    status: 'error',
                    message: 'Invalid refresh token'
                });
            }
            
            if (new Date() > tokenRecord.expires_at) {
                await RefreshToken.revoke(refresh_token);
                return res.status(401).json({
                    status: 'error',
                    message: 'Refresh token expired. Please login again.'
                });
            }
            
            const user = await User.findById(tokenRecord.user_id);
            
            if (!user?.is_active) {
                return res.status(403).json({
                    status: 'error',
                    message: 'User account is inactive'
                });
            }
            
            // Revoke old token
            await RefreshToken.revoke(refresh_token);
            
            // Generate new tokens
            const newAccessToken = TokenService.generateAccessToken(user.id, user.role);
            const newRefreshToken = TokenService.generateRefreshToken();
            const expiresAt = TokenService.calculateExpiry(
                Number.parseInt(process.env.JWT_REFRESH_EXPIRY) / 60
            );
            
            await RefreshToken.create(user.id, newRefreshToken, expiresAt);
            
            res.json({
                status: 'success',
                access_token: newAccessToken,
                refresh_token: newRefreshToken
            });
        } catch (error) {
            console.error('Token refresh error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to refresh token'
            });
        }
    }
    
    static async logout(req, res) {
        try {
            let refreshToken = req.body.refresh_token || req.cookies?.refresh_token;
            
            if (refreshToken) {
                await RefreshToken.revoke(refreshToken);
            }
            
            res.clearCookie('access_token');
            res.clearCookie('refresh_token');
            res.clearCookie('csrf-secret');
            
            res.json({
                status: 'success',
                message: 'Logged out successfully'
            });
        } catch (error) {
            console.error('Logout error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to logout'
            });
        }
    }
}

module.exports = AuthController;