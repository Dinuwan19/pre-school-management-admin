const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { authenticateToken, authorizeRole } = require('../middlewares/auth.middleware');

router.use(authenticateToken);

const upload = require('../middlewares/upload.middleware');

router.get('/history', authorizeRole(['SUPER_ADMIN', 'ADMIN']), paymentController.getPaymentHistory);
router.get('/pending', authorizeRole(['SUPER_ADMIN', 'ADMIN']), paymentController.getPendingPayments);
router.post('/submit', upload.single('receipt'), paymentController.submitPayment);
router.post('/verify', authorizeRole(['SUPER_ADMIN', 'ADMIN']), paymentController.verifyPayment);

module.exports = router;
