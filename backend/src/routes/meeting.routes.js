const express = require('express');
const router = express.Router();
const meetingController = require('../controllers/meeting.controller');
const { authenticateToken, authorizeRole } = require('../middlewares/auth.middleware');
const { checkParentAccess } = require('../middlewares/access.middleware');

router.use(authenticateToken);

router.post('/request', checkParentAccess, authorizeRole(['PARENT']), meetingController.requestMeeting);
router.get('/parent', checkParentAccess, authorizeRole(['PARENT']), meetingController.getParentMeetings);
router.get('/teacher', authorizeRole(['TEACHER', 'ADMIN', 'SUPER_ADMIN', 'STAFF']), meetingController.getTeacherMeetings);
router.put('/:id/status', authorizeRole(['TEACHER', 'ADMIN', 'SUPER_ADMIN', 'STAFF']), meetingController.updateMeetingStatus);

module.exports = router;
