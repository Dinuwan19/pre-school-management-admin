const express = require('express');
const router = express.Router();
const homeworkController = require('../controllers/homework.controller');
const { authenticateToken, authorizeRole } = require('../middlewares/auth.middleware');
const { checkClassroomScope, checkParentAccess } = require('../middlewares/access.middleware');

router.use(authenticateToken);

router.get('/', checkClassroomScope, checkParentAccess, homeworkController.getAllHomework);
router.post('/', checkClassroomScope, authorizeRole(['SUPER_ADMIN', 'ADMIN', 'TEACHER']), homeworkController.createHomework);
router.delete('/:id', authorizeRole(['SUPER_ADMIN', 'ADMIN', 'TEACHER']), homeworkController.deleteHomework);

module.exports = router;
