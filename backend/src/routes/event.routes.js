const express = require('express');
const router = express.Router();
const eventController = require('../controllers/event.controller');
const { authenticateToken, authorizeRole } = require('../middlewares/auth.middleware');
const { checkClassroomScope, checkParentAccess } = require('../middlewares/access.middleware');
const upload = require('../middlewares/upload.middleware');

router.use(authenticateToken);

// View events - Open to staff/parents
router.get('/', checkClassroomScope, checkParentAccess, eventController.getAllEvents);
router.get('/:id', checkClassroomScope, checkParentAccess, eventController.getEventById);

// Manage events
router.post('/', checkClassroomScope, authorizeRole(['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STAFF']), eventController.createEvent);
router.put('/:id/approve', authorizeRole(['SUPER_ADMIN', 'ADMIN']), eventController.approveEvent);
router.put('/:id/status', authorizeRole(['SUPER_ADMIN', 'ADMIN']), eventController.updateEventStatus);

// Waiting List
router.get('/waiting-list/all', authorizeRole(['SUPER_ADMIN', 'ADMIN']), eventController.getWaitingList);
router.post('/waiting-list', checkParentAccess, authorizeRole(['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'PARENT']), eventController.addToWaitingList);
router.put('/waiting-list/:id/approve', authorizeRole(['SUPER_ADMIN', 'ADMIN']), eventController.approveWaitingList);

// Media Management
router.post('/:id/media', upload.fields([{ name: 'media', maxCount: 10 }]), authorizeRole(['SUPER_ADMIN', 'ADMIN', 'STAFF', 'TEACHER']), eventController.uploadEventMedia);
router.delete('/media/:id', authorizeRole(['SUPER_ADMIN', 'ADMIN']), eventController.deleteEventMedia);

module.exports = router;
