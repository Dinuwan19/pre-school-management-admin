const express = require('express');
const router = express.Router();
const specialDayController = require('../controllers/specialDay.controller');
const { verifyToken, isAdmin } = require('../middlewares/auth');

router.get('/', verifyToken, specialDayController.getAllSpecialDays);
router.post('/', verifyToken, isAdmin, specialDayController.createSpecialDay);
router.delete('/:id', verifyToken, isAdmin, specialDayController.deleteSpecialDay);

module.exports = router;
