const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const { requestLogger } = require("./middleware/logger");
const { validateEnv } = require("./config/env");

// Import routes
const authRoutes = require("./routes/auth");
const profileRoutes = require("./routes/profiles");
const userRoutes = require("./routes/users");

// Validate environment variables
validateEnv();

const app = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: [
      process.env.WEB_PORTAL_URL,
      "http://localhost:3001",
      "http://localhost:8080",
      "https://insighta-web-3bpe.onrender.com",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-API-Version",
      "X-CSRF-Token",
    ],
  }),
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use(requestLogger);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`[DEBUG] ${req.method} ${req.url}`);
  next();
});

// Routes - FIXED: Remove trailing slash from mount path
app.use("/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/profiles", profileRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: `Endpoint not found: ${req.method} ${req.originalUrl}`,
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    status: "error",
    message: "Internal server error",
  });
});

module.exports = app;
