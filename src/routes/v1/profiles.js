const express = require('express');
const router = express.Router();
const ProfileController = require('../../controllers/profileController');
const ExportController = require('../../controllers/exportController');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const { apiLimiter } = require('../../middleware/rateLimiter');
const { requireApiVersion } = require('../../middleware/apiVersion');

// Apply versioning and authentication to all routes
router.use(requireApiVersion('1'));
router.use(authenticate);
router.use(apiLimiter);

// GET routes (accessible by both admin and analyst)
router.get('/profiles', requireRole('admin', 'analyst'), ProfileController.getAllProfiles);
router.get('/profiles/search', requireRole('admin', 'analyst'), ProfileController.searchProfiles);
router.get('/profiles/:id', requireRole('admin', 'analyst'), ProfileController.getProfileById);
router.get('/profiles/export/csv', requireRole('admin', 'analyst'), ExportController.exportProfilesCSV);

// POST, DELETE routes (admin only)
router.post('/profiles', requireRole('admin'), ProfileController.createProfile);
router.delete('/profiles/:id', requireRole('admin'), ProfileController.deleteProfile);

module.exports = router;