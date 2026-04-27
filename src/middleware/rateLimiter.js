const rateLimit = require("express-rate-limit");

// Rate limiter for auth endpoints (10 requests per minute)
const authLimiter = rateLimit({
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
const apiLimiter = rateLimit({
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
const strictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: {
    status: "error",
    message: "Too many write operations. Please slow down.",
  },
  keyGenerator: (req) => req.user?.id || req.ip,
});

module.exports = { authLimiter, apiLimiter, strictLimiter };
