const express = require('express');
const router = express.Router();
const eventController = require('../controllers/event.controller');
const { authenticateToken, authorizeRole } = require('../middlewares/auth.middleware');

router.use(authenticateToken);

// View events - Open to staff/parents (managed by frontend filtering/backend role check if needed)
router.get('/', eventController.getAllEvents);
router.get('/:id', eventController.getEventById);

// Manage events - Admin only
router.post('/', authorizeRole(['SUPER_ADMIN', 'ADMIN']), eventController.createEvent);
router.put('/:id/status', authorizeRole(['SUPER_ADMIN', 'ADMIN']), eventController.updateEventStatus);

// Waiting List
router.get('/waiting-list/all', authorizeRole(['SUPER_ADMIN', 'ADMIN']), eventController.getWaitingList);
router.post('/waiting-list', authorizeRole(['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'PARENT']), eventController.addToWaitingList);
router.put('/waiting-list/:id/approve', authorizeRole(['SUPER_ADMIN', 'ADMIN']), eventController.approveWaitingList);

module.exports = router;
