const express = require('express');
const router = express.Router();
const skillController = require('../controllers/skill.controller');
const { protect, authorize, checkClassroomScope } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/categories', skillController.getCategories);
router.get('/sub-skill/:subSkillId/students', checkClassroomScope, skillController.getStudentsForSubSkill);
router.post('/bulk-update', authorize('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STAFF'), skillController.bulkUpdateScores);

module.exports = router;
