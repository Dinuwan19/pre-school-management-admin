const express = require('express');
const router = express.Router();
const meetingController = require('../controllers/meeting.controller');
const { authenticateToken, authorizeRole } = require('../middlewares/auth.middleware');

router.use(authenticateToken);

router.post('/request', authorizeRole(['PARENT']), meetingController.requestMeeting);
router.get('/parent', authorizeRole(['PARENT']), meetingController.getParentMeetings);
router.get('/teacher', authorizeRole(['TEACHER', 'ADMIN', 'SUPER_ADMIN']), meetingController.getTeacherMeetings);
router.put('/:id/status', authorizeRole(['TEACHER', 'ADMIN', 'SUPER_ADMIN']), meetingController.updateMeetingStatus);

module.exports = router;
