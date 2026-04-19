const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staff.controller');
const { authenticateToken, authorizeRole } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');
const { validate, userSchema } = require('../middlewares/validate.middleware');

router.use(authenticateToken);

// GET all staff - SUPER_ADMIN only for listing
router.get('/', authorizeRole(['SUPER_ADMIN']), staffController.getAllStaff);
router.post('/', authorizeRole(['SUPER_ADMIN']), upload.fields([{ name: 'qualificationPdf', maxCount: 1 }]), validate(userSchema), staffController.createStaff);
router.get('/:id', staffController.getStaffById); // Authorization handled in controller
router.put('/:id', upload.fields([
    { name: 'qualificationPdf', maxCount: 1 },
    { name: 'signature', maxCount: 1 }
]), validate(userSchema), staffController.updateStaff); // Authorization handled in controller

module.exports = router;
