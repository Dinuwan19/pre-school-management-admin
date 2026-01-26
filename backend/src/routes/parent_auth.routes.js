const express = require('express');
const router = express.Router();
const parentAuthController = require('../controllers/parent_auth.controller');
const { authenticateToken, authorizeRole } = require('../middlewares/auth.middleware');

router.post('/signup', parentAuthController.parentSignup);
router.get('/children', authenticateToken, authorizeRole(['PARENT']), parentAuthController.getLinkedChildren);
router.get('/billings', authenticateToken, authorizeRole(['PARENT']), parentAuthController.getParentBillings);
router.get('/profile', authenticateToken, authorizeRole(['PARENT']), parentAuthController.getParentProfile);
router.put('/profile', authenticateToken, authorizeRole(['PARENT']), parentAuthController.updateParentProfile);

module.exports = router;
