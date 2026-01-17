const prisma = require('../config/prisma');
const dayjs = require('dayjs');

exports.getStats = async (req, res, next) => {
    try {
        const today = dayjs().format('YYYY-MM-DD');
        const startOfMonth = dayjs().startOf('month').toDate();

        // 1. Basic Counts
        const [studentCount, staffCount, classroomCount, parentCount] = await Promise.all([
            prisma.student.count({ where: { status: 'ACTIVE' } }),
            prisma.user.count({ where: { role: { in: ['ADMIN', 'TEACHER'] }, status: 'ACTIVE' } }),
            prisma.classroom.count({ where: { status: 'ACTIVE' } }),
            prisma.parent.count({ where: { status: 'ACTIVE' } })
        ]);

        // 2. Attendance Today %
        const presentToday = await prisma.attendance.count({
            where: {
                attendanceDate: new Date(today),
                checkInTime: { not: null }
            }
        });
        const attendancePercentage = studentCount > 0 ? Math.round((presentToday / studentCount) * 100) : 0;

        // 3. Billing Stats (Current Month)
        const currentMonthBillings = await prisma.billing.findMany({
            where: { createdAt: { gte: startOfMonth } }
        });
        const totalAmount = currentMonthBillings.reduce((sum, b) => sum + parseFloat(b.amount), 0);
        const paidAmount = currentMonthBillings
            .filter(b => b.status === 'PAID')
            .reduce((sum, b) => sum + parseFloat(b.amount), 0);

        const paymentPercentage = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;

        // 4. Upcoming Events (Notifications marked as ALL or PARENT/TEACHER with no billingMonth)
        // For simplicity, we'll fetch announcements that have a "targetRole" but aren't fee reminders
        const events = await prisma.notification.findMany({
            where: {
                billingMonth: null,
                createdAt: { gte: dayjs().subtract(7, 'days').toDate() }
            },
            take: 5,
            orderBy: { createdAt: 'desc' }
        });

        res.json({
            counts: {
                students: studentCount,
                staff: staffCount,
                classrooms: classroomCount,
                parents: parentCount
            },
            analytics: {
                attendanceToday: attendancePercentage,
                paymentProgress: paymentPercentage
            },
            events
        });
    } catch (error) {
        next(error);
    }
};
