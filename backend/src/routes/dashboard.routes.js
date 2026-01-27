const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { authenticateToken, authorizeRole } = require('../middlewares/auth.middleware');
const { checkClassroomScope } = require('../middlewares/access.middleware');

router.get('/stats', authenticateToken, checkClassroomScope, dashboardController.getStats);
router.get('/parent-stats', authenticateToken, authorizeRole(['PARENT']), dashboardController.getParentStats);

module.exports = router;
