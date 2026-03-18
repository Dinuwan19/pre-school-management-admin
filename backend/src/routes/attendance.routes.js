const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendance.controller');
const { authenticateToken, authorizeRole } = require('../middlewares/auth.middleware');
const { checkClassroomScope, checkParentAccess } = require('../middlewares/access.middleware');

router.use(authenticateToken);

router.post('/scan', checkClassroomScope, authorizeRole(['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'CASHIER', 'STAFF']), attendanceController.scanAttendance);
router.post('/manual', checkClassroomScope, authorizeRole(['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STAFF']), attendanceController.manualAttendance);
router.post('/bulk', checkClassroomScope, authorizeRole(['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STAFF']), attendanceController.bulkMarkAttendance);
router.get('/daily', checkClassroomScope, authorizeRole(['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STAFF']), attendanceController.getDailyAttendance);
router.get('/student/:studentId', checkParentAccess, authorizeRole(['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'PARENT', 'CASHIER', 'STAFF']), attendanceController.getStudentAttendanceSummary);

module.exports = router;
