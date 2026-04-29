const express = require("express");
const router = express.Router();
const UserController = require("../controllers/userController");
const { authenticate } = require("../middleware/auth");
const { requireApiVersion } = require("../middleware/apiVersion");
const { apiLimiter } = require("../middleware/rateLimiter");

// Apply middleware to all routes
router.use(requireApiVersion("1"));
router.use(authenticate);
router.use(apiLimiter);

// Get current user profile
router.get("/me", UserController.getCurrentUser);

module.exports = router;
