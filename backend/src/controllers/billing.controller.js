const prisma = require('../config/prisma');
const { getNextReceiptNo, generateInvoice } = require('../services/invoice.service');

exports.generateBilling = async (req, res, next) => {
    console.log('[Billing] Generating billing for:', req.body);
    try {
        const { studentId, billingMonth, billingMonths, amount, categoryId } = req.body;

        // Handle multiple months if provided
        const monthsToProcess = billingMonths || (billingMonth ? [billingMonth] : []);

        if (monthsToProcess.length === 0) {
            return res.status(400).json({ message: 'No billing month specified' });
        }

        // --- Double Billing Check ---
        const existingBillings = await prisma.billing.findMany({
            where: { studentId: parseInt(studentId) }
        });

        // Flatten all billed months (including consolidated comma-separated ones)
        const allBilledMonths = existingBillings.reduce((acc, b) => {
            const months = b.billingMonth.split(',').map(m => m.trim());
            return [...acc, ...months];
        }, []);

        const overlaps = monthsToProcess.filter(m => allBilledMonths.includes(m));
        if (overlaps.length > 0 && !categoryId) { // Don't block custom categories if they want to bill extra
            return res.status(400).json({
                message: `The following months are already billed for this student: ${overlaps.join(', ')}`
            });
        }
        // ---------------------------

        // Consolidated Billing Logic:
        // Join months into a single string e.g., "January, February"
        const monthString = monthsToProcess.sort().join(', ');

        // Create ONE billing record
        const billing = await prisma.billing.create({
            data: {
                studentId: parseInt(studentId),
                billingMonth: monthString,
                amount: parseFloat(amount), // Assumes amount passed is total
                status: 'UNPAID',
                categoryId: categoryId ? parseInt(categoryId) : null
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
        if (billing.status !== 'UNPAID') return res.status(400).json({ message: 'This month is already paid or verification is pending.' });

        // 1. Update Billing Status
        const updatedBilling = await prisma.billing.update({
            where: { id: billing.id },
            data: { status: 'PAID' }
        });

        // 2. Create Payment Record (Auto-Approved)
        const payment = await prisma.payment.create({
            data: {
                amountPaid: billing.amount,
                paymentMethod: 'CASH',
                status: 'APPROVED',
                verifiedById: req.user.id,
                verifiedAt: new Date(),
                receiptNo: await getNextReceiptNo(),
                billingpayment: {
                    create: { billingId: billing.id }
                }
            }
        });

        // 3. Generate Invoice
        try {
            const invoiceUrl = await generateInvoice(payment.id);
            await prisma.payment.update({
                where: { id: payment.id },
                data: { invoiceUrl }
            });
        } catch (invError) {
            console.error('Cash Invoice Gen Error:', invError);
        }

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
                    select: { fullName: true, studentUniqueId: true, parentId: true, secondParentId: true }
                },
                billingCategory: true,
                billingpayment: {
                    include: {
                        payment: {
                            include: { user: true }
                        }
                    }
                }
            },
            orderBy: { billingMonth: 'desc' }
        });

        // If specific studentId and PARENT role, return unified object with stats and full payment history
        // If specific studentId and PARENT role, return unified object with stats and full payment history
        if (studentId && req.user.role === 'PARENT') {
            // Fetch student details explicitly to ensure we have identifiers for payment search
            const studentDetails = await prisma.student.findUnique({
                where: { id: parseInt(studentId) },
                select: { studentUniqueId: true, fullName: true }
            });

            // Fallback to billing student if explicit fetch fails (unlikely if ID matches)
            const sId = studentDetails?.studentUniqueId || billings[0]?.student?.studentUniqueId || '';
            const sName = studentDetails?.fullName || billings[0]?.student?.fullName || '';

            const payments = await prisma.payment.findMany({
                where: {
                    OR: [
                        { billingpayment: { some: { billing: { studentId: parseInt(studentId) } } } },
                        { transactionRef: { contains: `[Student ID: ${sId}]` } },
                        { transactionRef: { contains: `[Student: ${sName}]` } }
                    ]
                },
                orderBy: { createdAt: 'desc' }
            });

            const totalPaid = payments
                .filter(p => p.status === 'APPROVED')
                .reduce((sum, p) => sum + parseFloat(p.amountPaid), 0);

            const pending = payments
                .filter(p => p.status === 'PENDING')
                .reduce((sum, p) => sum + parseFloat(p.amountPaid), 0);

            return res.json({
                billings,
                payments,
                totalPaid,
                pending,
                stats: { totalPaid, pending }
            });
        }

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

        const parentUser = billing.student.parent_student_parentIdToparent;
        if (!parentUser || !parentUser.userId) {
            return res.status(400).json({ message: 'Parent user account not found for this student' });
        }

        const notification = await prisma.notification.create({
            data: {
                title: 'Fee Reminder',
                message: `Please complete the school fee payment for ${billing.billingMonth} for ${billing.student.fullName}.`,
                targetRole: 'PERSONAL', // Changed from PARENT to prevent broadcast overlap
                targetParentId: parentUser.userId, // Targeted notification
                billingMonth: billing.billingMonth,
                createdById: req.user.id
            }
        });

        res.json({ message: 'Notification sent to parent', notification });
    } catch (error) {
        next(error);
    }
};

exports.getOverdueBillings = async (req, res, next) => {
    try {
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

        // Business Rule: "Overdue" means unpaid after the 5th of the month.
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonthIndex = now.getMonth(); // 0-11
        const currentDay = now.getDate();

        const overdueBillings = billings.filter(bill => {
            // Heuristic: Check createdAt or billingMonth string
            // Assuming billingMonth strings (e.g. "January" or "2024-01")

            // 1. If bill is old (created before this month), it's definitely overdue
            const billDate = new Date(bill.createdAt);
            if (billDate.getMonth() < currentMonthIndex || billDate.getFullYear() < currentYear) {
                return true;
            }

            // 2. If bill is current month, check if today > 5th
            if (billDate.getMonth() === currentMonthIndex && billDate.getFullYear() === currentYear) {
                return currentDay > 5;
            }

            return false;
        });

        res.json(overdueBillings);
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

        // 5. Pending Total = Online payments waiting approval (PENDING) + Overdue Unpaid Billings
        const pendingPaymentsAgg = await prisma.payment.aggregate({
            _sum: { amountPaid: true },
            where: { status: 'PENDING' }
        });
        const verificationQueueTotal = pendingPaymentsAgg._sum.amountPaid ? parseFloat(pendingPaymentsAgg._sum.amountPaid) : 0;

        // Overdue logic: Unpaid billings before the 5th of the current month
        const now = new Date();
        const fifthOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 5, 0, 0, 0);

        const overdueBillingsAgg = await prisma.billing.aggregate({
            _sum: { amount: true },
            where: {
                status: 'UNPAID',
                createdAt: { lt: fifthOfCurrentMonth }
            }
        });
        const overdueTotal = overdueBillingsAgg._sum.amount ? parseFloat(overdueBillingsAgg._sum.amount) : 0;

        const pendingTotal = verificationQueueTotal + overdueTotal;

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
                details: (() => {
                    const linkedName = p.billingpayment?.[0]?.billing?.student?.fullName;
                    if (linkedName) return linkedName;

                    if (p.transactionRef) {
                        const match = p.transactionRef.match(/\[Student:\s(.*?)]/);
                        if (match) return match[1];
                    }
                    return 'Unknown Student';
                })(),
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
