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
