const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { authenticateToken, authorizeRole } = require('../middlewares/auth.middleware');

router.get('/stats', authenticateToken, dashboardController.getStats);
router.get('/parent-stats', authenticateToken, authorizeRole(['PARENT']), dashboardController.getParentStats);

module.exports = router;
