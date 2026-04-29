const rateLimit = require("express-rate-limit");

// Only skip rate limiting during Jest testing (NODE_ENV=test AND running under Jest)
const isJest = process.env.NODE_ENV === "test" && typeof jest !== "undefined";

// Rate limiter for auth endpoints (10 requests per minute)
const authLimiter = isJest
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 10,
      message: {
        status: "error",
        message: "Too many authentication attempts. Please try again later.",
      },
      keyGenerator: (req) => req.ip,
      standardHeaders: true, // Send rate limit info in headers
      legacyHeaders: false,
      skipFailedRequests: false,
      skipSuccessfulRequests: false,
    });

// Rate limiter for API endpoints (60 requests per minute per user)
const apiLimiter = isJest
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: 60 * 1000,
      max: 60,
      message: {
        status: "error",
        message: "Rate limit exceeded. Please slow down your requests.",
      },
      keyGenerator: (req) => req.user?.id || req.ip,
      standardHeaders: true,
      legacyHeaders: false,
    });

// Stricter limiter for create/delete operations
const strictLimiter = isJest
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: 60 * 1000,
      max: 30,
      message: {
        status: "error",
        message: "Too many write operations. Please slow down.",
      },
      keyGenerator: (req) => req.user?.id || req.ip,
    });

module.exports = { authLimiter, apiLimiter, strictLimiter };
