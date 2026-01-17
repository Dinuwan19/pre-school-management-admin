const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { authenticateToken, authorizeRole } = require('../middlewares/auth.middleware');

router.use(authenticateToken);

router.get('/', notificationController.getAllNotifications);
router.post('/', authorizeRole(['SUPER_ADMIN', 'ADMIN']), notificationController.createNotification);
router.delete('/:id', authorizeRole(['SUPER_ADMIN', 'ADMIN']), notificationController.deleteNotification);

module.exports = router;
