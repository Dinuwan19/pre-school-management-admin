const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

const { authenticateToken } = require('../middlewares/auth.middleware');

router.post('/login', authController.login);
// Register should be restricted to SUPER_ADMIN to prevent unauthorized admin creation
const { authorizeRole } = require('../middlewares/auth.middleware');
router.post('/register', authenticateToken, authorizeRole(['SUPER_ADMIN']), authController.register);
router.post('/change-password', authenticateToken, authController.changePassword);
router.post('/forgot-password', authController.requestPasswordReset);
router.post('/reset-password', authController.resetPassword);

module.exports = router;
