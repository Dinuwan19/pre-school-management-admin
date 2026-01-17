const prisma = require('../config/prisma');

exports.createExpense = async (req, res, next) => {
    try {
        const { category, amount, description, expenseDate } = req.body;
        const expense = await prisma.expense.create({
            data: {
                category,
                amount: parseFloat(amount),
                description,
                expenseDate: expenseDate ? new Date(expenseDate) : new Date()
            }
        });
        res.status(201).json(expense);
    } catch (error) {
        next(error);
    }
};

exports.getAllExpenses = async (req, res, next) => {
    try {
        const expenses = await prisma.expense.findMany({
            orderBy: { expenseDate: 'desc' }
        });
        res.json(expenses);
    } catch (error) {
        next(error);
    }
};

exports.getExpenseSummary = async (req, res, next) => {
    try {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);

        const summary = await prisma.expense.aggregate({
            _sum: { amount: true },
            where: {
                expenseDate: { gte: firstDay }
            }
        });

        res.json({
            totalMonthly: summary._sum.amount || 0
        });
    } catch (error) {
        next(error);
    }
};
