const express = require('express');
const router = express.Router();
const classroomController = require('../controllers/classroom.controller');
const { authenticateToken, authorizeRole } = require('../middlewares/auth.middleware');

router.use(authenticateToken);

router.post('/', authorizeRole(['SUPER_ADMIN', 'ADMIN', 'STAFF']), classroomController.createClassroom);
router.get('/', authorizeRole(['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STAFF', 'CASHIER']), classroomController.getAllClassrooms);
router.get('/:id', authorizeRole(['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STAFF', 'CASHIER']), classroomController.getClassroomById);
router.put('/:id', authorizeRole(['SUPER_ADMIN', 'ADMIN', 'STAFF']), classroomController.updateClassroom);
router.post('/:id/teachers', authorizeRole(['SUPER_ADMIN', 'ADMIN', 'STAFF']), classroomController.assignTeacher);

module.exports = router;
