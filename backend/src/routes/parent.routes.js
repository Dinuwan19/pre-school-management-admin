const express = require('express');
const router = express.Router();
const parentController = require('../controllers/parent.controller');
const { authenticateToken, authorizeRole } = require('../middlewares/auth.middleware');
const { checkClassroomScope } = require('../middlewares/access.middleware');
const { validate, parentSchema } = require('../middlewares/validate.middleware');

router.use(authenticateToken);

router.post('/', authorizeRole(['SUPER_ADMIN', 'ADMIN']), validate(parentSchema), parentController.createParent);
router.get('/', checkClassroomScope, authorizeRole(['SUPER_ADMIN', 'ADMIN', 'TEACHER']), parentController.getAllParents);
router.get('/:id', checkClassroomScope, authorizeRole(['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'PARENT']), parentController.getParentById);
router.put('/:id', authorizeRole(['SUPER_ADMIN', 'ADMIN']), validate(parentSchema), parentController.updateParent);
router.delete('/:id', authorizeRole(['SUPER_ADMIN', 'ADMIN']), parentController.deleteParent);

module.exports = router;
