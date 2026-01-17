const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billing.controller');
const { authenticateToken, authorizeRole } = require('../middlewares/auth.middleware');

router.use(authenticateToken);

router.get('/', billingController.getAllBillings);
router.post('/generate', authorizeRole(['SUPER_ADMIN', 'ADMIN']), billingController.generateBilling);
router.post('/notify', authorizeRole(['SUPER_ADMIN', 'ADMIN']), billingController.notifyUnpaid);

module.exports = router;
