const prisma = require('../config/prisma');

exports.createExpense = async (req, res, next) => {
    try {
        const { category, amount, expenseDate, description } = req.body;

        let receiptUrl = null;
        if (req.files && req.files['receipt']) {
            receiptUrl = `/uploads/${req.files['receipt'][0].filename}`;
        }

        const expense = await prisma.expense.create({
            data: {
                category,
                amount: parseFloat(amount),
                expenseDate: new Date(expenseDate),
                description,
                receiptUrl
            }
        });

        await logAction(req.user.id, `CREATE_EXPENSE: ${expense.amount} for ${expense.category}`);
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

        const total = summary._sum.amount ? parseFloat(summary._sum.amount) : 0;

        res.json({
            totalThisMonth: total
        });
    } catch (error) {
        next(error);
    }
};
