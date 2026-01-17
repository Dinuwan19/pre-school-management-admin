const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expense.controller');
const { authenticateToken, authorizeRole } = require('../middlewares/auth.middleware');

router.use(authenticateToken);

router.post('/', authorizeRole(['SUPER_ADMIN', 'ADMIN']), expenseController.createExpense);
router.get('/', authorizeRole(['SUPER_ADMIN', 'ADMIN']), expenseController.getAllExpenses);
router.get('/summary', authorizeRole(['SUPER_ADMIN', 'ADMIN']), expenseController.getExpenseSummary);

module.exports = router;
