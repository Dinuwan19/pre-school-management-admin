const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expense.controller');
const { authenticateToken, authorizeRole } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');

router.use(authenticateToken);

router.post('/', authorizeRole(['SUPER_ADMIN', 'ADMIN', 'CASHIER']), upload.fields([{ name: 'receipt', maxCount: 1 }]), expenseController.createExpense);
router.get('/', authorizeRole(['SUPER_ADMIN', 'ADMIN', 'CASHIER']), expenseController.getAllExpenses);
router.get('/summary', authorizeRole(['SUPER_ADMIN', 'ADMIN', 'CASHIER']), expenseController.getExpenseSummary);
router.delete('/:id', authorizeRole(['SUPER_ADMIN', 'ADMIN']), expenseController.deleteExpense);

module.exports = router;
