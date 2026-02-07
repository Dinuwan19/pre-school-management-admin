const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { authenticateToken, authorizeRole } = require('../middlewares/auth.middleware');
const { checkClassroomScope, checkParentAccess } = require('../middlewares/access.middleware');

router.use(authenticateToken);

router.get('/', checkClassroomScope, checkParentAccess, notificationController.getAllNotifications);
router.post('/', checkClassroomScope, authorizeRole(['SUPER_ADMIN', 'ADMIN', 'TEACHER']), notificationController.createNotification);
router.delete('/:id', authorizeRole(['SUPER_ADMIN', 'ADMIN']), notificationController.deleteNotification);

module.exports = router;
