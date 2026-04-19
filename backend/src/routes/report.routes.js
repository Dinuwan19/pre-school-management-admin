const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { authenticateToken, authorizeRole } = require('../middlewares/auth.middleware');

router.use(authenticateToken);
router.use(authorizeRole(['SUPER_ADMIN', 'ADMIN']));

router.post('/generate', reportController.generateReport);
router.get('/recent', reportController.getRecentReports);
router.get('/download/:id', reportController.downloadReport);
router.delete('/:id', reportController.deleteReport);

module.exports = router;
