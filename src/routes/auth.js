const express = require("express");
const router = express.Router();
const AuthController = require("../controllers/authController");
const { authLimiter } = require("../middleware/rateLimiter");

router.use(authLimiter);

// Generate GitHub OAuth URL (used by CLI and Web)
router.get("/github", (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  let redirectUri = process.env.GITHUB_CALLBACK_URL;
  const state = req.query.state || "";
  const isCLI = req.query.is_cli === "true";
  const cliCallbackUrl =
    req.query.cli_callback_url || "http://localhost:8080/callback";
  const codeVerifier = req.query.code_verifier || "";

  // Allow CLI to override redirect_uri with its local callback
  if (isCLI && req.query.redirect_uri) {
    redirectUri = req.query.redirect_uri;
  }

  let url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email`;

  if (state) {
    url += `&state=${encodeURIComponent(state)}`;
  } else if (isCLI) {
    // Create state object with CLI flag, callback URL, and code_verifier (for PKCE)
    const stateObj = JSON.stringify({
      is_cli: true,
      cli_callback_url: cliCallbackUrl,
      code_verifier: codeVerifier,
    });
    url += `&state=${encodeURIComponent(stateObj)}`;
  }

  if (isCLI) {
    url += `&is_cli=true`;
  }

  res.json({ url });
});

router.get("/github/callback", AuthController.githubCallback);
router.post("/refresh", authLimiter, AuthController.refreshToken);
router.post("/logout", AuthController.logout);

module.exports = router;
