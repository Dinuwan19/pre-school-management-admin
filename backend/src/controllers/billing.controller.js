const prisma = require('../config/prisma');

exports.generateBilling = async (req, res, next) => {
    console.log('[Billing] Generating billing for:', req.body);
    try {
        const { studentId, billingMonth, amount } = req.body;

        // Check if billing already exists for this student and month
        const existing = await prisma.billing.findFirst({
            where: { studentId: parseInt(studentId), billingMonth }
        });

        if (existing) {
            return res.status(400).json({ message: 'Billing for this month already exists for this student' });
        }

        const billing = await prisma.billing.create({
            data: {
                studentId: parseInt(studentId),
                billingMonth,
                amount: parseFloat(amount),
                status: 'UNPAID'
            }
        });

        res.status(201).json(billing);
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

        // We need the parent's user account. Finding user by parent's email/phone if linked.
        // Assuming Parent logic links to User in future, for now broadcasting or target parent if exists.

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
        // 1. Total Paid Income (Status = PAID)
        const paidBillings = await prisma.billing.aggregate({
            _sum: { amount: true },
            where: { status: 'PAID' }
        });
        const totalIncome = paidBillings._sum.amount ? parseFloat(paidBillings._sum.amount) : 0;

        // 2. Pending Payments (From Payment table with status PENDING)
        const pendingPayments = await prisma.payment.aggregate({
            _sum: { amountPaid: true },
            where: { status: 'PENDING' }
        });
        const pendingTotal = pendingPayments._sum.amountPaid ? parseFloat(pendingPayments._sum.amountPaid) : 0;

        // 3. Total Expenses (MTD - Month to Date, or Total? Let's do Total for Net Income context)
        // Ideally Net Income = Total Income (All Time) - Total Expenses (All Time)
        // Or Monthly. Let's do Monthly for "Overview" usually.
        // BUT user asked to "Match with all incomes". Let's assume ALL TIME for Net Income for now unless filtered.
        // Let's stick to Month for the dashboard cards usually, but allow full range. 
        // Based on user: "net income calculate of income and expenses not use pending payments"

        // Let's implement MTD (Month to Date) for the cards as it's standard.
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const currentMonthExpenses = await prisma.expense.aggregate({
            _sum: { amount: true },
            where: { expenseDate: { gte: startOfMonth } }
        });
        const expenseTotalMTD = currentMonthExpenses._sum.amount ? parseFloat(currentMonthExpenses._sum.amount) : 0;

        // NET INCOME Calculation (MTD)
        // Paid Incomes MTD
        // We need to filter billing by payment date? Billing doesn't capture payment date easily without join.
        // Let's filter Billing by billingMonth = current YYYY-MM.
        const currentMonthStr = new Date().toISOString().slice(0, 7); // YYYY-MM
        const monthPaidBillings = await prisma.billing.aggregate({
            _sum: { amount: true },
            where: { status: 'PAID', billingMonth: currentMonthStr }
        });
        const incomeMTD = monthPaidBillings._sum.amount ? parseFloat(monthPaidBillings._sum.amount) : 0;
        const netIncomeMTD = incomeMTD - expenseTotalMTD;


        // RECENT TRANSACTIONS (Mixed 5)
        // Payment (Income) vs Expense (Outcome)
        // We need 5 most recent from both tables combined.
        const recentPayments = await prisma.payment.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: { billingpayment: { include: { billing: { include: { student: true } } } } }
        });

        const recentExpenses = await prisma.expense.findMany({
            take: 5,
            orderBy: { expenseDate: 'desc' }
        });

        // Combine and sort
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
            expenseMTD: expenseTotalMTD,
            netIncomeMTD,
            pendingTotal, // Total pending queue
            recentTransactions: transactions
        });

    } catch (error) {
        next(error);
    }
};
