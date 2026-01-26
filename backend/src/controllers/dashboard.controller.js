const prisma = require('../config/prisma');
const dayjs = require('dayjs');
const relativeTime = require('dayjs/plugin/relativeTime');
dayjs.extend(relativeTime);

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

exports.getParentStats = async (req, res, next) => {
    try {
        const { id, username } = req.user;
        const parent = await prisma.parent.findFirst({
            where: {
                OR: [
                    { userId: id },
                    { email: username }
                ]
            },
            include: {
                student_student_parentIdToparent: {
                    include: {
                        classroom: {
                            include: {
                                teacherprofile: {
                                    where: { designation: 'LEAD' },
                                    include: { user: true }
                                }
                            }
                        }
                    }
                },
                student_student_secondParentIdToparent: {
                    include: {
                        classroom: {
                            include: {
                                teacherprofile: {
                                    where: { designation: 'LEAD' },
                                    include: { user: true }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!parent) {
            return res.status(404).json({ message: 'Parent profile not found' });
        }

        // Combine children from both relationships
        const children = [
            ...(parent.student_student_parentIdToparent || []),
            ...(parent.student_student_secondParentIdToparent || [])
        ].filter(s => s.status === 'ACTIVE');

        const childrenStats = await Promise.all(children.map(async (child) => {
            // 1. Today's Attendance
            const todayStr = dayjs().format('YYYY-MM-DD');
            const attendance = await prisma.attendance.findFirst({
                where: {
                    studentId: child.id,
                    attendanceDate: new Date(todayStr),
                    status: { in: ['PRESENT', 'LATE', 'COMPLETED'] }
                }
            });

            // 2. Fees Status & Total Balance
            const allBillings = await prisma.billing.findMany({
                where: { studentId: child.id }
            });
            const pendingBillings = allBillings.filter(b => b.status !== 'PAID');
            const totalBalance = pendingBillings.reduce((sum, b) => sum + parseFloat(b.amount), 0);

            const currentMonthStr = dayjs().format('MMMM');
            const currentBilling = allBillings.find(b => b.billingMonth.includes(currentMonthStr));
            let feeStatus = 'No Bill';
            if (currentBilling) feeStatus = currentBilling.status === 'PAID' ? 'Paid' : 'Pending';

            // 3. Attendance Rate (Current Month)
            const startOfMonth = dayjs().startOf('month').toDate();
            const endOfMonth = dayjs().endOf('month').toDate();
            const monthAttendance = await prisma.attendance.findMany({
                where: {
                    studentId: child.id,
                    attendanceDate: { gte: startOfMonth, lte: endOfMonth }
                }
            });
            const presentInMonth = monthAttendance.filter(a => ['PRESENT', 'LATE', 'COMPLETED'].includes(a.status)).length;
            const attendanceRate = monthAttendance.length > 0 ? Math.round((presentInMonth / monthAttendance.length) * 100) : 0;

            // 4. Progress Average (Latest)
            const progress = await prisma.studentprogress.findFirst({
                where: { studentId: child.id },
                orderBy: { updatedAt: 'desc' }
            });
            let progressAvg = 0;
            if (progress) {
                const scores = [
                    progress.reading, progress.writing, progress.speaking,
                    progress.listening, progress.mathematics, progress.social
                ].filter(s => s !== null);
                if (scores.length > 0) {
                    progressAvg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
                }
            }

            return {
                id: child.id,
                fullName: child.fullName,
                photoUrl: child.photoUrl,
                classroomId: child.classroomId,
                classroom: child.classroom?.name,
                teacherName: child.classroom?.teacherprofile?.[0]?.user?.fullName || 'Ms. Dilani',
                attendance: attendance ? 'Present' : 'Absent',
                attendanceRate,
                feeStatus,
                balance: totalBalance,
                progress: progressAvg,
                latestRemarks: progress?.remarks
            };
        }));

        // 4. Upcoming Events (Meetings + School Events)
        const meetings = await prisma.meeting_request.findMany({
            where: { parentId: parent.id, status: 'APPROVED', requestDate: { gte: new Date() } },
            take: 3,
            orderBy: { requestDate: 'asc' }
        });

        // 5. Recent Updates (Notifications tailored to children's classrooms)
        const classroomIds = children.map(c => c.classroomId);
        const updates = await prisma.notification.findMany({
            where: {
                OR: [
                    { targetRole: 'ALL' },
                    { targetRole: 'PARENT' },
                    { targetClassroomId: { in: classroomIds } }
                ]
            },
            take: 5,
            orderBy: { createdAt: 'desc' }
        });

        res.json({
            children: childrenStats,
            upcomingEvents: meetings.map(m => ({
                id: m.id,
                title: m.title,
                date: dayjs(m.requestDate).format('MMM DD'),
                time: m.preferredTime || 'TBD',
                type: 'MEETING'
            })),
            updates: updates.map(u => ({
                id: u.id,
                title: u.title,
                message: u.message,
                date: dayjs(u.createdAt).fromNow(),
                type: 'NOTICE'
            })),
            profile: {
                fullName: parent.fullName,
                email: parent.email,
                phone: parent.phone,
                nic: parent.nationalId,
                address: parent.address
            }
        });

    } catch (error) {
        next(error);
    }
};
