const { pool } = require("../config/database");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const crypto = require("node:crypto");

class AuthController {
  // Generate GitHub OAuth URL with PKCE
  static async githubCallback(req, res) {
    const { code, state } = req.query;

    let is_cli = false;
    try {
      const stateObj = JSON.parse(state);
      is_cli = stateObj.is_cli === true;
    } catch (e) {
      console.warn("Invalid GitHub callback state payload:", e.message);
      is_cli = req.query.is_cli === "true";
    }

    console.log("📥 GitHub Callback received");
    console.log("is_cli flag:", is_cli);

    if (!code) {
      return res.status(400).json({
        status: "error",
        message: "Authorization code required",
      });
    }

    try {
      // Exchange code for access token
      const tokenResponse = await axios.post(
        "https://github.com/login/oauth/access_token",
        {
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code: code,
          redirect_uri: process.env.GITHUB_CALLBACK_URL,
        },
        {
          headers: { Accept: "application/json" },
        },
      );

      const { access_token } = tokenResponse.data;

      if (!access_token) {
        throw new Error("Failed to get access token from GitHub");
      }

      // Get user data from GitHub
      const userResponse = await axios.get("https://api.github.com/user", {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      const githubUser = userResponse.data;

      // Get user email
      const emailResponse = await axios.get(
        "https://api.github.com/user/emails",
        {
          headers: { Authorization: `Bearer ${access_token}` },
        },
      );
      const primaryEmail = emailResponse.data.find((email) => email.primary);

      // Check if user exists, create or update
      let user = await pool.query("SELECT * FROM users WHERE github_id = $1", [
        githubUser.id.toString(),
      ]);

      if (user.rows.length === 0) {
        // Create new user with default role 'analyst'
        const insertResult = await pool.query(
          `
                    INSERT INTO users (github_id, username, email, avatar_url, role, is_active, last_login_at)
                    VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
                    RETURNING id, username, email, role, is_active
                `,
          [
            githubUser.id.toString(),
            githubUser.login,
            primaryEmail?.email || null,
            githubUser.avatar_url,
            "analyst",
            true,
          ],
        );
        user = insertResult.rows[0];
      } else {
        // Update existing user
        user = user.rows[0];
        await pool.query(
          `
                    UPDATE users 
                    SET username = $1, email = $2, avatar_url = $3, last_login_at = CURRENT_TIMESTAMP
                    WHERE id = $4
                `,
          [
            githubUser.login,
            primaryEmail?.email || null,
            githubUser.avatar_url,
            user.id,
          ],
        );
      }

      // Check if user is active
      if (!user.is_active) {
        return res.status(403).json({
          status: "error",
          message: "Account is deactivated. Contact administrator.",
        });
      }

      // Generate tokens
      const accessToken = jwt.sign(
        { userId: user.id, role: user.role, type: "access" },
        process.env.JWT_SECRET,
        { expiresIn: Number.parseInt(process.env.JWT_ACCESS_EXPIRY) },
      );

      const refreshToken = crypto.randomBytes(64).toString("hex");
      const refreshExpiresAt = new Date(
        Date.now() + Number.parseInt(process.env.JWT_REFRESH_EXPIRY) * 1000,
      );

      // Store refresh token (revoke old ones first)
      await pool.query(
        "UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND revoked_at IS NULL",
        [user.id],
      );

      await pool.query(
        "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)",
        [user.id, refreshToken, refreshExpiresAt],
      );

      // Set cookies
      res.cookie("access_token", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: Number.parseInt(process.env.JWT_ACCESS_EXPIRY) * 1000,
      });

      res.cookie("refresh_token", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: Number.parseInt(process.env.JWT_REFRESH_EXPIRY) * 1000,
      });

      // Check if request is from CLI
      if (is_cli === "true") {
        return res.json({
          status: "success",
          access_token: accessToken,
          refresh_token: refreshToken,
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
          },
        });
      }

      // Redirect to web portal
      console.log("🌐 Web request detected, redirecting to dashboard");
      res.redirect(
        `${process.env.WEB_PORTAL_URL || "http://localhost:3001"}/dashboard`,
      );
    } catch (error) {
      console.error(
        "GitHub callback error:",
        error.response?.data || error.message,
      );
      res.status(500).json({
        status: "error",
        message: "Authentication failed. Please try again.",
      });
    }
  }

  // Refresh token endpoint with rotation
  static async refreshToken(req, res) {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        status: "error",
        message: "Refresh token required",
      });
    }

    try {
      // Find refresh token
      const tokenResult = await pool.query(
        "SELECT * FROM refresh_tokens WHERE token = $1 AND revoked_at IS NULL",
        [refresh_token],
      );

      if (tokenResult.rows.length === 0) {
        return res.status(401).json({
          status: "error",
          message: "Invalid refresh token",
        });
      }

      const tokenRecord = tokenResult.rows[0];

      // Check expiry
      if (new Date() > tokenRecord.expires_at) {
        await pool.query(
          "UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE token = $1",
          [refresh_token],
        );
        return res.status(401).json({
          status: "error",
          message: "Refresh token expired. Please login again.",
        });
      }

      // Get user
      const userResult = await pool.query(
        "SELECT * FROM users WHERE id = $1 AND is_active = true",
        [tokenRecord.user_id],
      );

      if (userResult.rows.length === 0) {
        return res.status(403).json({
          status: "error",
          message: "User not found or inactive",
        });
      }

      const user = userResult.rows[0];

      // Revoke old token (rotation)
      await pool.query(
        "UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE token = $1",
        [refresh_token],
      );

      // Generate new tokens
      const newAccessToken = jwt.sign(
        { userId: user.id, role: user.role, type: "access" },
        process.env.JWT_SECRET,
        { expiresIn: Number.parseInt(process.env.JWT_ACCESS_EXPIRY) },
      );

      const newRefreshToken = crypto.randomBytes(64).toString("hex");
      const refreshExpiresAt = new Date(
        Date.now() + Number.parseInt(process.env.JWT_REFRESH_EXPIRY) * 1000,
      );

      // Store new refresh token
      await pool.query(
        "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)",
        [user.id, newRefreshToken, refreshExpiresAt],
      );

      res.json({
        status: "success",
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
      });
    } catch (error) {
      console.error("Refresh error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to refresh token",
      });
    }
  }

  // Logout - invalidate refresh token
  static async logout(req, res) {
    const refreshToken = req.body.refresh_token || req.cookies?.refresh_token;

    if (refreshToken) {
      await pool.query(
        "UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE token = $1",
        [refreshToken],
      );
    }

    res.clearCookie("access_token");
    res.clearCookie("refresh_token");

    res.json({
      status: "success",
      message: "Logged out successfully",
    });
  }
}

module.exports = AuthController;
