const prisma = require('../config/prisma');

/**
 * Create a new billing category.
 * SUPER_ADMIN only.
 */
exports.createCategory = async (req, res, next) => {
    try {
        const { name, reason, amount, validUntil, classroomIds, frequency } = req.body;

        const category = await prisma.billingCategory.create({
            data: {
                name,
                reason,
                amount: parseFloat(amount),
                validUntil: new Date(validUntil),
                frequency: frequency || 'RECURRING',
                classrooms: {
                    connect: classroomIds.map(id => ({ id: parseInt(id) }))
                }
            },
            include: { classrooms: true }
        });

        res.status(201).json({
            message: 'Billing category created successfully',
            data: category
        });
    } catch (error) {
        next(error);
    }
};

exports.getAllCategories = async (req, res, next) => {
    try {
        const { activeOnly, studentId } = req.query;
        let where = {};

        if (activeOnly === 'true') {
            where.validUntil = { gte: new Date() };
        }

        // Parent specific scoping
        if (req.user.role === 'PARENT') {
            const parentProfile = await prisma.parent.findFirst({
                where: { userId: req.user.id },
                include: {
                    student_student_parentIdToparent: { select: { classroomId: true } },
                    student_student_secondParentIdToparent: { select: { classroomId: true } }
                }
            });

            if (parentProfile) {
                const classroomIds = [
                    ...parentProfile.student_student_parentIdToparent.map(s => s.classroomId),
                    ...parentProfile.student_student_secondParentIdToparent.map(s => s.classroomId)
                ];

                where.classrooms = {
                    some: {
                        id: { in: classroomIds }
                    }
                };
            } else {
                return res.json([]);
            }
        }

        const categories = await prisma.billingCategory.findMany({
            where,
            include: { classrooms: true },
            orderBy: { createdAt: 'desc' }
        });

        // Use 'studentId' param to filter out ONE_TIME items already paid
        if (studentId) {
            const hasHistory = await prisma.billing.findMany({
                where: {
                    studentId: parseInt(studentId),
                    categoryId: { not: null },
                    OR: [
                        { status: 'PAID' },
                        { status: 'PENDING' }, // Also hide pending to prevent double pay
                        { status: 'APPROVED' }
                    ]
                },
                select: { categoryId: true }
            });

            const paidCategoryIds = new Set(hasHistory.map(b => b.categoryId));

            // Filter out ONE_TIME categories that are already in paid history
            const filtered = categories.filter(c => {
                if (c.frequency === 'ONE_TIME' && paidCategoryIds.has(c.id)) {
                    return false;
                }
                return true;
            });

            return res.json(filtered);
        }

        res.json(categories);
    } catch (error) {
        next(error);
    }
};

/**
 * Delete a category (soft/hard)
 */
exports.deleteCategory = async (req, res, next) => {
    try {
        const { id } = req.params;
        await prisma.billingCategory.delete({
            where: { id: parseInt(id) }
        });
        res.json({ message: 'Category deleted successfully' });
    } catch (error) {
        next(error);
    }
};

/**
 * Get statistics for a specific category
 */
exports.getCategoryStats = async (req, res, next) => {
    try {
        const { id } = req.params;
        const category = await prisma.billingCategory.findUnique({
            where: { id: parseInt(id) },
            include: {
                billings: {
                    include: {
                        student: { select: { fullName: true, studentUniqueId: true } }
                    }
                },
                classrooms: {
                    include: {
                        _count: {
                            select: { student: { where: { status: 'ACTIVE' } } }
                        }
                    }
                }
            }
        });

        if (!category) return res.status(404).json({ message: 'Category not found' });

        // Calculate total students who SHOULD pay
        const eligibleStudentCount = category.classrooms.reduce((sum, c) => sum + c._count.student, 0);
        
        // If no classrooms are linked, fall back to current billing count (legacy/manual behavior)
        const totalExpected = eligibleStudentCount > 0 
            ? eligibleStudentCount * parseFloat(category.amount)
            : category.billings.length * parseFloat(category.amount);

        const totalPaid = category.billings
            .filter(b => b.status === 'PAID')
            .reduce((sum, b) => sum + parseFloat(b.amount), 0);

        const paidCount = category.billings.filter(b => b.status === 'PAID').length;
        const unpaidCount = category.billings.filter(b => b.status === 'UNPAID').length;

        res.json({
            category,
            stats: {
                totalExpected,
                totalPaid,
                paidCount,
                unpaidCount,
                collectionRate: totalExpected > 0 ? (totalPaid / totalExpected) * 100 : 0,
                totalEligible: eligibleStudentCount
            }
        });
    } catch (error) {
        next(error);
    }
};
