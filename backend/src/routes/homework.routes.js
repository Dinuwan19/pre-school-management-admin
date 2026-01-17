const express = require('express');
const router = express.Router();
const homeworkController = require('../controllers/homework.controller');
const { authenticateToken, authorizeRole } = require('../middlewares/auth.middleware');

router.use(authenticateToken);

router.get('/', homeworkController.getAllHomework);
router.post('/', authorizeRole(['SUPER_ADMIN', 'ADMIN', 'TEACHER']), homeworkController.createHomework);
router.delete('/:id', authorizeRole(['SUPER_ADMIN', 'ADMIN', 'TEACHER']), homeworkController.deleteHomework);

module.exports = router;
