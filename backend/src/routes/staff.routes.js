const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staff.controller');
const { authenticateToken, authorizeRole } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');
const { validate, userSchema } = require('../middlewares/validate.middleware');

router.use(authenticateToken);
router.use(authorizeRole(['SUPER_ADMIN']));

router.get('/', staffController.getAllStaff);
router.post('/', upload.fields([{ name: 'photo', maxCount: 1 }, { name: 'qualificationPdf', maxCount: 1 }]), validate(userSchema), staffController.createStaff);
router.get('/:id', staffController.getStaffById);
router.put('/:id', upload.fields([{ name: 'photo', maxCount: 1 }, { name: 'qualificationPdf', maxCount: 1 }]), validate(userSchema), staffController.updateStaff);

module.exports = router;
