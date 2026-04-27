const express = require("express");
const router = express.Router();
const AuthController = require("../controllers/authController");
const { authLimiter } = require("../middleware/rateLimiter");

router.use(authLimiter);

// Generate GitHub OAuth URL (used by CLI and Web)
router.get("/github", (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = process.env.GITHUB_CALLBACK_URL;
  const state = req.query.state || "";
  const isCLI = req.query.is_cli === "true";

  let url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user:email`;

  if (state) {
    url += `&state=${state}`;
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
