const express = require('express');
const router = express.Router();
const skillController = require('../controllers/skill.controller');
const { authenticateToken, authorizeRole } = require('../middlewares/auth.middleware');
const { checkClassroomScope } = require('../middlewares/access.middleware');

router.use(authenticateToken);

router.get('/categories', skillController.getCategories);
router.get('/sub-skill/:subSkillId/students', checkClassroomScope, skillController.getStudentsForSubSkill);
router.post('/bulk-update', authorizeRole(['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STAFF']), skillController.bulkUpdateScores);

module.exports = router;
