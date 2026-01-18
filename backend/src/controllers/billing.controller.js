const prisma = require('../config/prisma');

exports.generateBilling = async (req, res, next) => {
    console.log('[Billing] Generating billing for:', req.body);
    try {
        const { studentId, billingMonth, billingMonths, amount } = req.body;

        // Handle multiple months if provided
        const monthsToProcess = billingMonths || (billingMonth ? [billingMonth] : []);

        if (monthsToProcess.length === 0) {
            return res.status(400).json({ message: 'No billing month specified' });
        }

        // Consolidated Billing Logic:
        // Join months into a single string e.g., "January, February"
        const monthString = monthsToProcess.sort().join(', ');

        // Create ONE billing record
        const billing = await prisma.billing.create({
            data: {
                studentId: parseInt(studentId),
                billingMonth: monthString,
                amount: parseFloat(amount), // Assumes amount passed is total
                status: 'UNPAID'
            }
        });

        res.status(201).json({
            message: `Generated consolidated bill for ${monthString}`,
            data: [billing]
        });
    } catch (error) {
        next(error);
    }
};

exports.payBillingCash = async (req, res, next) => {
    try {
        const { billingId } = req.body;
        const billing = await prisma.billing.findUnique({ where: { id: parseInt(billingId) } });

        if (!billing) return res.status(404).json({ message: 'Billing record not found' });
        if (billing.status === 'PAID') return res.status(400).json({ message: 'Billing already paid' });

        // 1. Update Billing Status
        const updatedBilling = await prisma.billing.update({
            where: { id: billing.id },
            data: { status: 'PAID' }
        });

        // 2. Create Payment Record (Auto-Approved)
        await prisma.payment.create({
            data: {
                amountPaid: billing.amount,
                paymentMethod: 'CASH',
                status: 'APPROVED',
                verifiedById: req.user.id,
                verifiedAt: new Date(),
                billingpayment: {
                    create: { billingId: billing.id }
                }
            }
        });

        res.json({ message: 'Cash payment recorded successfully', billing: updatedBilling });
    } catch (error) {
        next(error);
    }
};

exports.getAllBillings = async (req, res, next) => {
    console.log('[Billing] Getting all billings. Query:', req.query);
    try {
        const { studentId, status } = req.query;
        let where = {};
        if (studentId) where.studentId = parseInt(studentId);
        if (status) where.status = status;

        // Data Scoping
        if (req.user.role === 'PARENT') {
            const parentProfile = await prisma.parent.findFirst({
                where: { email: req.user.username }
            });

            if (parentProfile) {
                where.student = {
                    OR: [
                        { parentId: parentProfile.id },
                        { secondParentId: parentProfile.id }
                    ]
                };
            } else {
                return res.json([]);
            }
        }

        const billings = await prisma.billing.findMany({
            where,
            include: {
                student: {
                    select: { fullName: true, studentUniqueId: true }
                }
            },
            orderBy: { billingMonth: 'desc' }
        });

        res.json(billings);
    } catch (error) {
        next(error);
    }
};

exports.notifyUnpaid = async (req, res, next) => {
    try {
        const { billingId } = req.body;
        const billing = await prisma.billing.findUnique({
            where: { id: parseInt(billingId) },
            include: { student: { include: { parent_student_parentIdToparent: true } } }
        });

        if (!billing) return res.status(404).json({ message: 'Billing not found' });

        // In a real app, this would send an SMS/Email. 
        // For this project, we create a Notification record for the Parent.

        const notification = await prisma.notification.create({
            data: {
                title: 'Fee Reminder',
                message: `Please complete the school fee payment for ${billing.billingMonth} for ${billing.student.fullName}.`,
                targetRole: 'PARENT',
                billingMonth: billing.billingMonth,
                createdById: req.user.id
            }
        });

        res.json({ message: 'Notification sent', notification });
    } catch (error) {
        next(error);
    }
};

exports.getOverdueBillings = async (req, res, next) => {
    try {
        // Find UNPAID billings.
        // In a real system, we'd check if currentDate > billingMonth + 1 month or something.
        // For now, any UNPAID is considered potentially overdue or just pending.
        // Let's assume we want all UNPAID billings to track them.

        const billings = await prisma.billing.findMany({
            where: { status: 'UNPAID' },
            include: {
                student: {
                    select: {
                        fullName: true,
                        studentUniqueId: true,
                        parent_student_parentIdToparent: { select: { phone: true, email: true } }
                    }
                }
            },
            orderBy: { billingMonth: 'desc' }
        });

        res.json(billings);
    } catch (error) {
        next(error);
    }
};

exports.getDashboardStats = async (req, res, next) => {
    try {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const currentMonthStr = new Date().toISOString().slice(0, 7); // YYYY-MM

        // 1. Total Paid Income (All Time) - sum of all APPROVED payments
        const allPaymentsAgg = await prisma.payment.aggregate({
            _sum: { amountPaid: true },
            where: { status: 'APPROVED' }
        });
        const totalIncomeAllTime = allPaymentsAgg._sum.amountPaid ? parseFloat(allPaymentsAgg._sum.amountPaid) : 0;

        // 2. Total Expenses (All Time)
        const allExpenses = await prisma.expense.aggregate({
            _sum: { amount: true }
        });
        const totalExpensesAllTime = allExpenses._sum.amount ? parseFloat(allExpenses._sum.amount) : 0;

        // 3. Income MTD (Payments made this month)
        const monthPaymentsAgg = await prisma.payment.aggregate({
            _sum: { amountPaid: true },
            where: {
                status: 'APPROVED',
                createdAt: { gte: startOfMonth }
            }
        });
        const incomeMTD = monthPaymentsAgg._sum.amountPaid ? parseFloat(monthPaymentsAgg._sum.amountPaid) : 0;

        // 4. Expenses MTD
        const monthExpensesAgg = await prisma.expense.aggregate({
            _sum: { amount: true },
            where: { expenseDate: { gte: startOfMonth } }
        });
        const expenseMTD = monthExpensesAgg._sum.amount ? parseFloat(monthExpensesAgg._sum.amount) : 0;

        // 5. Pending Payments (Online payments waiting approval)
        const pendingPaymentsAgg = await prisma.payment.aggregate({
            _sum: { amountPaid: true },
            where: { status: 'PENDING' }
        });
        const pendingTotal = pendingPaymentsAgg._sum.amountPaid ? parseFloat(pendingPaymentsAgg._sum.amountPaid) : 0;

        const netIncomeAllTime = totalIncomeAllTime - totalExpensesAllTime;
        const netIncomeMTD = incomeMTD - expenseMTD;

        // RECENT TRANSACTIONS (Mixed 5)
        const recentPayments = await prisma.payment.findMany({
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: { billingpayment: { include: { billing: { include: { student: true } } } } }
        });

        const recentExpenses = await prisma.expense.findMany({
            take: 10,
            orderBy: { expenseDate: 'desc' }
        });

        const transactions = [
            ...recentPayments.map(p => ({
                type: 'INCOME',
                id: `PAY-${p.id}`,
                date: p.createdAt,
                amount: parseFloat(p.amountPaid),
                details: p.billingpayment?.[0]?.billing?.student?.fullName || 'Unknown Student',
                method: p.paymentMethod,
                ref: p.transactionRef
            })),
            ...recentExpenses.map(e => ({
                type: 'EXPENSE',
                id: `EXP-${e.id}`,
                date: e.expenseDate,
                amount: parseFloat(e.amount),
                details: e.category,
                description: e.description
            }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

        res.json({
            incomeMTD,
            expenseMTD,
            netIncomeMTD,
            totalIncome: totalIncomeAllTime,
            totalExpenses: totalExpensesAllTime,
            netIncome: netIncomeAllTime,
            pendingTotal,
            recentTransactions: transactions
        });

    } catch (error) {
        next(error);
    }
};
