const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendance.controller');
const { authenticateToken, authorizeRole } = require('../middlewares/auth.middleware');

router.use(authenticateToken);

router.post('/scan', authorizeRole(['SUPER_ADMIN', 'ADMIN', 'TEACHER']), attendanceController.scanAttendance);
router.post('/manual', authorizeRole(['SUPER_ADMIN', 'ADMIN', 'TEACHER']), attendanceController.manualAttendance);
router.post('/bulk', authorizeRole(['SUPER_ADMIN', 'ADMIN', 'TEACHER']), attendanceController.bulkMarkAttendance);
router.get('/daily', authorizeRole(['SUPER_ADMIN', 'ADMIN', 'TEACHER']), attendanceController.getDailyAttendance);
router.get('/student/:studentId', authorizeRole(['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'PARENT']), attendanceController.getStudentAttendanceSummary);

module.exports = router;
