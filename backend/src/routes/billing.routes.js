const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billing.controller');
const { authenticateToken, authorizeRole } = require('../middlewares/auth.middleware');

router.use(authenticateToken);

router.get('/overdue', authorizeRole(['SUPER_ADMIN', 'ADMIN']), billingController.getOverdueBillings);
router.get('/dashboard-stats', authorizeRole(['SUPER_ADMIN', 'ADMIN']), billingController.getDashboardStats);
/* router.get('/recent-transactions', authorizeRole(['SUPER_ADMIN', 'ADMIN']), billingController.getRecentTransactions); */
// Since recent transactions are part of dashboard stats now, maybe we don't need a separate endpoint?
// Actually I implemented it as returned inside dashboard stats. 
// But let's keep it separate if needed or just use the dashboard one. 
// Wait, I implemented it inside getDashboardStats in the controller.
// So I don't need a separate route for it unless I separate the logic.
// Checking controller... yes, it returns { ..., recentTransactions: [...] }.
// So only 'overdue' is separate.
router.get('/', billingController.getAllBillings);
router.post('/generate', authorizeRole(['SUPER_ADMIN', 'ADMIN']), billingController.generateBilling);
router.post('/notify', authorizeRole(['SUPER_ADMIN', 'ADMIN']), billingController.notifyUnpaid);

module.exports = router;
