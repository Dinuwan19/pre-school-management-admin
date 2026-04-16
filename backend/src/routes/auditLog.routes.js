const express = require('express');
const router = express.Router();
const auditLogController = require('../controllers/auditLog.controller');
const { authenticateToken, authorizeRole } = require('../middlewares/auth.middleware');

// Root route: /api/audit-logs
router.use(authenticateToken);
router.use(authorizeRole(['SUPER_ADMIN']));

router.get('/', auditLogController.getAuditLogs);

module.exports = router;
