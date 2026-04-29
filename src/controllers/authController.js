const { pool } = require("../config/database");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const crypto = require("node:crypto");

class AuthController {
  // Helper: Parse state and determine if CLI request
  static parseStateObject(state, queryIs_cli) {
    try {
      const stateObj = JSON.parse(state);
      return {
        is_cli: stateObj.is_cli === true,
        cli_callback_url:
          stateObj.cli_callback_url || "http://localhost:8080/callback",
      };
    } catch (e) {
      console.warn("Invalid GitHub callback state payload:", e.message);
      return {
        is_cli: queryIs_cli === "true",
        cli_callback_url: "http://localhost:8080/callback",
      };
    }
  }

  // Helper: Get OAuth credentials based on request type
  static getOAuthCredentials(isCLI) {
    if (isCLI) {
      return {
        clientId: process.env.CLI_GITHUB_CLIENT_ID,
        clientSecret: process.env.CLI_GITHUB_CLIENT_SECRET,
      };
    }
    return {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    };
  }

  // Helper: Create or update user
  static async getOrCreateUser(githubUser, primaryEmail) {
    const user = await pool.query("SELECT * FROM users WHERE github_id = $1", [
      githubUser.id.toString(),
    ]);

    if (user.rows.length === 0) {
      console.log("👤 Creating new user:", githubUser.login);
      const insertResult = await pool.query(
        `INSERT INTO users (github_id, username, email, avatar_url, role, is_active, last_login_at)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
         RETURNING id, username, email, role, is_active`,
        [
          githubUser.id.toString(),
          githubUser.login,
          primaryEmail?.email || null,
          githubUser.avatar_url,
          "analyst",
          true,
        ],
      );
      const newUser = insertResult.rows[0];
      console.log("✅ New user created:", newUser.id);
      return newUser;
    }

    const existingUser = user.rows[0];
    console.log("👤 Updating existing user:", githubUser.login);
    await pool.query(
      `UPDATE users SET username = $1, email = $2, avatar_url = $3, last_login_at = CURRENT_TIMESTAMP WHERE id = $4`,
      [
        githubUser.login,
        primaryEmail?.email || null,
        githubUser.avatar_url,
        existingUser.id,
      ],
    );
    console.log("✅ User updated:", existingUser.id);
    return existingUser;
  }

  static async githubCallback(req, res) {
    const { code, state } = req.query;

    const { is_cli, cli_callback_url } = AuthController.parseStateObject(
      state,
      req.query.is_cli,
    );
    const githubRedirectUri = is_cli
      ? cli_callback_url
      : process.env.GITHUB_CALLBACK_URL;

    console.log("📥 GitHub Callback received");
    console.log("is_cli flag:", is_cli);
    console.log("Using redirect_uri for token exchange:", githubRedirectUri);

    if (!code) {
      return res.status(400).json({
        status: "error",
        message: "Authorization code required",
      });
    }

    try {
      const { clientId, clientSecret } =
        AuthController.getOAuthCredentials(is_cli);
      console.log(`🔑 Using OAuth app: ${is_cli ? "CLI" : "Web"}`);
      console.log(`🔑 Client ID: ${clientId?.substring(0, 15)}...`);

      const tokenResponse = await axios.post(
        "https://github.com/login/oauth/access_token",
        {
          client_id: clientId,
          client_secret: clientSecret,
          code: code,
          redirect_uri: githubRedirectUri,
        },
        {
          headers: { Accept: "application/json" },
        },
      );

      const { access_token } = tokenResponse.data;

      if (!access_token) {
        console.error(
          "No access token received. Response:",
          tokenResponse.data,
        );
        throw new Error("Failed to get access token from GitHub");
      }

      console.log("✅ Access token received from GitHub");

      // Get user data from GitHub
      const userResponse = await axios.get("https://api.github.com/user", {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      const githubUser = userResponse.data;
      console.log("✅ GitHub user data retrieved:", githubUser.login);

      // Get user email
      const emailResponse = await axios.get(
        "https://api.github.com/user/emails",
        {
          headers: { Authorization: `Bearer ${access_token}` },
        },
      );
      const primaryEmail = emailResponse.data.find((email) => email.primary);
      console.log("✅ Email data retrieved");

      const user = await AuthController.getOrCreateUser(
        githubUser,
        primaryEmail,
      );

      if (!user.is_active) {
        return res.status(403).json({
          status: "error",
          message: "Account is deactivated. Contact administrator.",
        });
      }

      // Generate tokens
      console.log("🔐 Generating JWT tokens...");
      const accessToken = jwt.sign(
        { userId: user.id, role: user.role, type: "access" },
        process.env.JWT_SECRET,
        { expiresIn: Number.parseInt(process.env.JWT_ACCESS_EXPIRY) },
      );

      const refreshToken = crypto.randomBytes(64).toString("hex");
      const refreshExpiresAt = new Date(
        Date.now() + Number.parseInt(process.env.JWT_REFRESH_EXPIRY) * 1000,
      );
      console.log("✅ Tokens generated");

      // Store refresh token (revoke old ones first)
      console.log("💾 Storing refresh token...");
      await pool.query(
        "UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND revoked_at IS NULL",
        [user.id],
      );

      await pool.query(
        "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)",
        [user.id, refreshToken, refreshExpiresAt],
      );
      console.log("✅ Refresh token stored");

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
      if (is_cli) {
        console.log("📱 CLI request detected, returning JSON");
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
      console.error("❌ GitHub callback error:");
      console.error("Error message:", error.message);
      console.error("GitHub error response:", error.response?.data);
      console.error("Full error:", error);

      let errorMessage = "Authentication failed. Please try again.";
      if (error.response?.data?.error) {
        errorMessage = `GitHub error: ${error.response.data.error} - ${error.response.data.error_description || ""}`;
      }

      res.status(500).json({
        status: "error",
        message: errorMessage,
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

      await pool.query(
        "UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE token = $1",
        [refresh_token],
      );

      const newAccessToken = jwt.sign(
        { userId: user.id, role: user.role, type: "access" },
        process.env.JWT_SECRET,
        { expiresIn: Number.parseInt(process.env.JWT_ACCESS_EXPIRY) },
      );

      const newRefreshToken = crypto.randomBytes(64).toString("hex");
      const refreshExpiresAt = new Date(
        Date.now() + Number.parseInt(process.env.JWT_REFRESH_EXPIRY) * 1000,
      );

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
