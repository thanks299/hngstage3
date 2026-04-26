const express = require('express');
const router = express.Router();
const ProfileController = require('../controllers/profileController');
const ExportController = require('../controllers/exportController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { apiLimiter } = require('../middleware/rateLimiter');
const { requireApiVersion } = require('../middleware/apiVersion');

// Debug middleware for this router
router.use((req, res, next) => {
    console.log(`[PROFILE ROUTE] ${req.method} ${req.baseUrl}${req.url}`);
    next();
});

// Apply middleware to all routes
router.use(requireApiVersion('1'));
router.use(authenticate);
router.use(apiLimiter);

// Routes - NO trailing slashes
router.get('/', requireRole('admin', 'analyst'), ProfileController.getAllProfiles);
router.get('/search', requireRole('admin', 'analyst'), ProfileController.searchProfiles);
router.get('/export/csv', requireRole('admin', 'analyst'), ExportController.exportProfilesCSV);
router.get('/:id', requireRole('admin', 'analyst'), ProfileController.getProfileById);
router.post('/', requireRole('admin'), ProfileController.createProfile);
router.delete('/:id', requireRole('admin'), ProfileController.deleteProfile);

module.exports = router;