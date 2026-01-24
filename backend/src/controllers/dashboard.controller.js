const prisma = require('../config/prisma');
const dayjs = require('dayjs');

exports.getStats = async (req, res, next) => {
    try {
        console.log(`[Dashboard] Getting stats for user: ${req.user?.username} (Role: ${req.user?.role})`);
        const today = dayjs().format('YYYY-MM-DD');
        const startOfMonth = dayjs().startOf('month').toDate();

        // 1. Basic Counts
        const [studentCount, staffCount, classroomCount, parentCount] = await Promise.all([
            prisma.student.count({ where: { status: 'ACTIVE' } }),
            prisma.user.count({ where: { role: { in: ['ADMIN', 'TEACHER'] }, status: 'ACTIVE' } }),
            prisma.classroom.count({ where: { status: 'ACTIVE' } }),
            prisma.parent.count({ where: { status: 'ACTIVE' } })
        ]);

        // 2. Attendance Today
        const presentToday = await prisma.attendance.count({
            where: {
                attendanceDate: new Date(today),
                status: { in: ['PRESENT', 'LATE', 'COMPLETED'] }
            }
        });
        const attendanceAnalytics = {
            present: presentToday,
            total: studentCount,
            percentage: studentCount > 0 ? Math.round((presentToday / studentCount) * 100) : 0
        };

        // 3. Billing & Payments (Current Month)
        const currentMonthBillings = await prisma.billing.findMany({
            where: { createdAt: { gte: startOfMonth } }
        });

        const billingStats = {
            paid: currentMonthBillings.filter(b => b.status === 'PAID').length,
            pending: currentMonthBillings.filter(b => b.status === 'PENDING').length,
            overdue: currentMonthBillings.filter(b => b.status === 'OVERDUE').length,
            total: currentMonthBillings.length,
            progress: 0
        };

        if (billingStats.total > 0) {
            billingStats.progress = Math.round((billingStats.paid / billingStats.total) * 100);
        }

        // 4. Upcoming Events
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
                attendance: attendanceAnalytics,
                payments: billingStats
            },
            events
        });
    } catch (error) {
        next(error);
    }
};
