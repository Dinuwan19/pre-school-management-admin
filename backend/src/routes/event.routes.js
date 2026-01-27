const express = require('express');
const router = express.Router();
const eventController = require('../controllers/event.controller');
const { authenticateToken, authorizeRole } = require('../middlewares/auth.middleware');
const { checkClassroomScope } = require('../middlewares/access.middleware');

router.use(authenticateToken);

// View events - Open to staff/parents
router.get('/', checkClassroomScope, eventController.getAllEvents);
router.get('/:id', checkClassroomScope, eventController.getEventById);

// Manage events
router.post('/', checkClassroomScope, authorizeRole(['SUPER_ADMIN', 'ADMIN', 'TEACHER']), eventController.createEvent);
router.put('/:id/status', authorizeRole(['SUPER_ADMIN', 'ADMIN']), eventController.updateEventStatus);

// Waiting List
router.get('/waiting-list/all', authorizeRole(['SUPER_ADMIN', 'ADMIN']), eventController.getWaitingList);
router.post('/waiting-list', authorizeRole(['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'PARENT']), eventController.addToWaitingList);
router.put('/waiting-list/:id/approve', authorizeRole(['SUPER_ADMIN', 'ADMIN']), eventController.approveWaitingList);

module.exports = router;
