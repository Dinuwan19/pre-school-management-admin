const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { authenticateToken, authorizeRole } = require('../middlewares/auth.middleware');

router.use(authenticateToken);

router.get('/pending', authorizeRole(['SUPER_ADMIN', 'ADMIN']), paymentController.getPendingPayments);
router.post('/submit', paymentController.submitPayment);
router.post('/verify', authorizeRole(['SUPER_ADMIN', 'ADMIN']), paymentController.verifyPayment);

module.exports = router;
