const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { authenticateToken, authorizeRole } = require('../middlewares/auth.middleware');
const { checkParentAccess } = require('../middlewares/access.middleware');

router.use(authenticateToken);

const upload = require('../middlewares/upload.middleware');

router.get('/history', authorizeRole(['SUPER_ADMIN', 'ADMIN', 'CASHIER']), paymentController.getPaymentHistory);
router.get('/pending', authorizeRole(['SUPER_ADMIN', 'ADMIN', 'CASHIER']), paymentController.getPendingPayments);
router.post('/submit', checkParentAccess, upload.single('receipt'), paymentController.submitPayment);
router.post('/verify', authorizeRole(['SUPER_ADMIN', 'ADMIN', 'CASHIER']), paymentController.verifyPayment);

module.exports = router;
