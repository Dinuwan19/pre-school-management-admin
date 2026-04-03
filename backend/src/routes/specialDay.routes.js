const express = require('express');
const router = express.Router();
const specialDayController = require('../controllers/specialDay.controller');
const { authenticateToken, authorizeRole } = require('../middlewares/auth.middleware');

router.get('/', authenticateToken, specialDayController.getAllSpecialDays);
router.post('/', authenticateToken, authorizeRole(['SUPER_ADMIN', 'ADMIN']), specialDayController.createSpecialDay);
router.delete('/:id', authenticateToken, authorizeRole(['SUPER_ADMIN', 'ADMIN']), specialDayController.deleteSpecialDay);

module.exports = router;
