const express = require('express');
const router = express.Router();
const studentController = require('../controllers/student.controller');
const { authenticateToken, authorizeRole } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');
const { validate, studentSchema } = require('../middlewares/validate.middleware');

router.use(authenticateToken);

router.post('/', authorizeRole(['SUPER_ADMIN', 'ADMIN']), upload.fields([{ name: 'photo', maxCount: 1 }, { name: 'birthCert', maxCount: 1 }]), validate(studentSchema), studentController.createStudent);
router.get('/', authorizeRole(['SUPER_ADMIN', 'ADMIN', 'TEACHER']), studentController.getAllStudents);
router.get('/:id', authorizeRole(['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'PARENT']), studentController.getStudentById);
router.put('/:id', authorizeRole(['SUPER_ADMIN', 'ADMIN', 'PARENT']), upload.fields([{ name: 'photo', maxCount: 1 }, { name: 'birthCert', maxCount: 1 }]), validate(studentSchema), studentController.updateStudent);
router.put('/:id/progress', authorizeRole(['SUPER_ADMIN', 'ADMIN', 'TEACHER']), studentController.updateStudentProgress);

module.exports = router;
