/**
 * Passport configuration (kept for potential future OAuth strategies)
 * Currently using direct GitHub OAuth without Passport for simplicity
 */

// This file is intentionally minimal since we're using direct OAuth
// Keeping it just for backward compatibility

module.exports = {
    initialize: () => (req, res, next) => next(),
    session: () => (req, res, next) => next()
};