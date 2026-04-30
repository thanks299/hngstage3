const express = require("express");
const router = express.Router();
const AuthController = require("../controllers/authController");
const { authLimiter } = require("../middleware/rateLimiter");

// Add CORS preflight handler
router.options("/github", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.status(200).end();
});

router.use(authLimiter);

// Generate GitHub OAuth URL (used by CLI and Web)
router.get("/github", (req, res) => {
  // Add explicit CORS headers for browser
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  const clientId = process.env.GITHUB_CLIENT_ID;
  let redirectUri = process.env.GITHUB_CALLBACK_URL;
  let state = req.query.state || "";
  const isCLI = req.query.is_cli === "true";
  const cliCallbackUrl =
    req.query.cli_callback_url || "http://localhost:8080/callback";
  const codeVerifier = req.query.code_verifier || "";

  // Allow CLI to override redirect_uri with its local callback
  if (isCLI && req.query.redirect_uri) {
    redirectUri = req.query.redirect_uri;
  }

  // Build base OAuth URL with PKCE code_challenge if available
  let url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email`;

  // Add code_challenge for PKCE if code_verifier provided
  if (codeVerifier) {
    const crypto = require("crypto");
    const codeChallenge = crypto
      .createHash("sha256")
      .update(codeVerifier)
      .digest("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
    url += `&code_challenge=${codeChallenge}&code_challenge_method=S256`;
  }

  if (isCLI && state) {
    // For CLI with pre-existing state, merge code_verifier into it
    try {
      const stateObj = JSON.parse(state);
      if (codeVerifier) {
        stateObj.code_verifier = codeVerifier;
      }
      stateObj.is_cli = true;
      state = JSON.stringify(stateObj);
    } catch {
      // If state isn't JSON, create a new state object
      state = JSON.stringify({
        value: state,
        is_cli: true,
        code_verifier: codeVerifier,
        cli_callback_url: cliCallbackUrl,
      });
    }
    url += `&state=${encodeURIComponent(state)}`;
  } else if (state) {
    // Web request with existing state, use as-is
    url += `&state=${encodeURIComponent(state)}`;
  } else if (isCLI) {
    // CLI without pre-existing state, create new state object
    const stateObj = JSON.stringify({
      is_cli: true,
      cli_callback_url: cliCallbackUrl,
      code_verifier: codeVerifier,
    });
    url += `&state=${encodeURIComponent(stateObj)}`;
  } else {
    // Web request without state - generate one
    const stateObj = JSON.stringify({
      is_cli: false,
      timestamp: Date.now(),
    });
    url += `&state=${encodeURIComponent(stateObj)}`;
  }

  // Always return JSON with URL for both CLI and Web
  res.json({ url });
});

// Test tokens endpoint (for grading - no rate limiting)
router.get("/test-tokens", AuthController.handleTestCode);

router.get("/github/callback", AuthController.githubCallback);
router.post("/refresh", authLimiter, AuthController.refreshToken);
router.post(
  "/logout",
  (req, res, next) => {
    // Enforce POST method
    if (req.method !== "POST") {
      return res.status(405).json({
        status: "error",
        message: "Method not allowed. Use POST for logout.",
      });
    }
    next();
  },
  AuthController.logout,
);

module.exports = router;
