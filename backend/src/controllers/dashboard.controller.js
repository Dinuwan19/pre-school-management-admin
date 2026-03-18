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
        let studentCount, staffCount, classroomCount, parentCount;

        if (req.classroomScope) {
            // Teacher Scope
            const [sCount, pCount] = await Promise.all([
                prisma.student.count({ where: { status: 'ACTIVE', classroomId: { in: req.classroomScope } } }),
                prisma.parent.count({
                    where: {
                        status: 'ACTIVE',
                        OR: [
                            { student_student_parentIdToparent: { some: { classroomId: { in: req.classroomScope } } } },
                            { student_student_secondParentIdToparent: { some: { classroomId: { in: req.classroomScope } } } }
                        ]
                    }
                })
            ]);
            studentCount = sCount;
            parentCount = pCount;
            classroomCount = req.classroomScope.length;
            // Also show teachers/admins as staff for teachers
            staffCount = await prisma.user.count({ where: { role: { in: ['ADMIN', 'TEACHER'] }, status: 'ACTIVE' } });
        } else {
            // Admin Scope
            const [sCount, sCCount, cCount, pCount] = await Promise.all([
                prisma.student.count({ where: { status: 'ACTIVE' } }),
                prisma.user.count({ where: { role: { in: ['ADMIN', 'TEACHER'] }, status: 'ACTIVE' } }),
                prisma.classroom.count({ where: { status: 'ACTIVE' } }),
                prisma.parent.count({ where: { status: 'ACTIVE' } })
            ]);
            studentCount = sCount;
            staffCount = sCCount;
            classroomCount = cCount;
            parentCount = pCount;
        }

        // 2. Attendance Today
        let attendanceWhere = {
            attendanceDate: new Date(today),
            status: { in: ['PRESENT', 'LATE', 'COMPLETED'] }
        };
        if (req.classroomScope) {
            attendanceWhere.student = { classroomId: { in: req.classroomScope } };
        }

        const presentToday = await prisma.attendance.count({ where: attendanceWhere });
        const attendanceAnalytics = {
            present: presentToday,
            total: studentCount,
            percentage: studentCount > 0 ? Math.round((presentToday / studentCount) * 100) : 0
        };

        // 3. Billing & Payments (Only for Admins/Cashiers - Scoped users like teachers don't see this)
        let billingStats = null;
        if (!req.classroomScope) {
            const currentMonthBillings = await prisma.billing.findMany({
                where: { createdAt: { gte: startOfMonth } }
            });

            billingStats = {
                paid: currentMonthBillings.filter(b => b.status === 'PAID').length,
                pending: currentMonthBillings.filter(b => b.status === 'UNPAID' || b.status === 'PENDING').length,
                overdue: currentMonthBillings.filter(b => b.status === 'OVERDUE').length,
                total: currentMonthBillings.length,
                progress: 0
            };

            if (billingStats.total > 0) {
                billingStats.progress = Math.round((billingStats.paid / billingStats.total) * 100);
            }
        }

        // 4. Upcoming Events / Notifications
        let notificationWhere = {
            billingMonth: null,
            createdAt: { gte: dayjs().subtract(7, 'days').toDate() }
        };
        if (req.classroomScope) {
            notificationWhere.OR = [
                { targetClassroomId: { in: req.classroomScope } },
                { targetRole: 'ALL' },
                { targetRole: 'TEACHER' }
            ];
        }

        const events = await prisma.notification.findMany({
            where: notificationWhere,
            take: 5,
            orderBy: { createdAt: 'desc' }
        });

        // 5. Pending Meeting Count (New)
        let meetingWhere = { status: 'PENDING' };
        if (req.classroomScope) {
            meetingWhere.teacherId = req.user.id;
        }
        const pendingMeetingsCount = await prisma.meeting_request.count({ where: meetingWhere });

        // 6. Upcoming Meetings for Dashboard Feed (New)
        let dashboardMeetingWhere = { status: 'APPROVED' };
        if (req.classroomScope) {
            dashboardMeetingWhere.teacherId = req.user.id;
        }
        const upcomingMeetings = await prisma.meeting_request.findMany({
            where: dashboardMeetingWhere,
            take: 5,
            include: {
                student: { select: { fullName: true } },
                parent: { select: { fullName: true } }
            },
            orderBy: { requestDate: 'asc' }
        });

        res.json({
            counts: {
                students: studentCount,
                staff: staffCount,
                classrooms: classroomCount,
                parents: parentCount,
                pendingMeetings: pendingMeetingsCount
            },
            analytics: {
                attendance: attendanceAnalytics,
                payments: billingStats
            },
            events,
            upcomingMeetings
        });
    } catch (error) {
        next(error);
    }
};

exports.getParentStats = async (req, res, next) => {
    try {
        console.log(`[Dashboard] getParentStats - User ID: ${req.user?.id}, Username: ${req.user?.username}`);
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
                                teacherprofiles: {
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
                                teacherprofiles: {
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
            console.log(`[Dashboard] Parent profile not found for user: ${username}`);
            return res.status(404).json({ message: 'Parent profile not found' });
        }

        console.log(`[Dashboard] Found parent: ${parent.fullName} (ID: ${parent.id})`);

        // Combine children from both relationships
        const children = [
            ...(parent.student_student_parentIdToparent || []),
            ...(parent.student_student_secondParentIdToparent || [])
        ].filter(s => s.status === 'ACTIVE');

        console.log(`[Dashboard] Found ${children.length} active children`);

        const childrenStats = await Promise.all(children.map(async (child) => {
            console.log(`[Dashboard] Processing stats for child: ${child.fullName} (ID: ${child.id})`);

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
            const totalBalance = pendingBillings.reduce((sum, b) => sum + parseFloat(b.amount || 0), 0);

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

            // 4. Progress Average (Latest from Assessments)
            const assessment = await prisma.assessment.findFirst({
                where: { studentId: child.id },
                orderBy: { updatedAt: 'desc' },
                include: { scores: true }
            });
            let progressAvg = 0;
            if (assessment && assessment.scores && assessment.scores.length > 0) {
                const totalScore = assessment.scores.reduce((sum, s) => sum + s.score, 0);
                progressAvg = Math.round(totalScore / assessment.scores.length);
            }

            return {
                id: child.id,
                fullName: child.fullName,
                photoUrl: child.photoUrl,
                classroomId: child.classroomId,
                classroom: child.classroom?.name,
                teacherName: child.classroom?.teacherprofiles?.[0]?.user?.fullName || 'Ms. Dilani',
                attendance: attendance ? 'Present' : 'Absent',
                attendanceRate,
                feeStatus,
                balance: totalBalance,
                progress: progressAvg,
                latestRemarks: assessment?.remarks,
                gender: child.gender,
                parentUserId: parent.userId
            };
        }));

        console.log(`[Dashboard] Mapped children stats`);

        // 4. Upcoming Events (Meetings + School Events)
        const classroomIds = children.map(c => c.classroomId);

        // If no children, return empty state
        if (children.length === 0) {
            console.log(`[Dashboard] Returning empty status (no children)`);
            return res.json({
                children: [],
                upcomingEvents: [],
                updates: [],
                profile: {
                    fullName: parent.fullName,
                    email: parent.email,
                    phone: parent.phone,
                    nic: parent.nationalId,
                    address: parent.address,
                    relationship: parent.relationship
                }
            });
        }

        console.log(`[Dashboard] Fetching events, meetings, notifications...`);
        const [meetings, schoolEvents, notifications, homeworkItems] = await Promise.all([
            prisma.meeting_request.findMany({
                where: { parentId: parent.id, status: 'APPROVED', requestDate: { gte: new Date() } },
                take: 3,
                orderBy: { requestDate: 'asc' }
            }),
            prisma.event.findMany({
                take: 5,
                orderBy: { eventDate: 'asc' },
                include: {
                    event_media: true,
                    classrooms: { select: { id: true } }
                }
            }),
            prisma.notification.findMany({
                where: {
                    OR: [
                        { targetRole: 'ALL' },
                        { targetRole: 'PARENT', targetParentId: null },
                        { targetParentId: parent.userId },
                        { targetClassroomId: { in: classroomIds } }
                    ]
                },
                take: 5,
                orderBy: { createdAt: 'desc' }
            }),
            prisma.homework.findMany({
                where: { classroomId: { in: classroomIds } },
                take: 5,
                orderBy: { createdAt: 'desc' },
                include: { user: { select: { fullName: true } } }
            })
        ]);

        console.log(`[Dashboard] Processing updates and events`);

        // Combine and Sort Updates (Notifications + Homework)
        const combinedUpdates = [
            ...notifications.map(u => {
                const isFee = u.title?.toLowerCase().includes('fee') ||
                    u.message?.toLowerCase().includes('fee') ||
                    u.title?.toLowerCase().includes('payment') ||
                    u.message?.toLowerCase().includes('payment');

                return {
                    id: `notice-${u.id}`,
                    title: u.title,
                    message: u.message,
                    createdAt: u.createdAt,
                    type: isFee ? 'ALERT' : 'NOTICE',
                    targetClassroomId: u.targetClassroomId,
                    targetParentId: u.targetParentId,
                    targetRole: u.targetRole
                };
            }),
            ...homeworkItems.map(h => ({
                id: `hw-${h.id}`,
                title: `New Homework: ${h.title}`,
                message: `${h.description || 'New assignment posted.'}\nDue: ${h.dueDate ? dayjs(h.dueDate).format('MMM DD') : 'No date'}`,
                createdAt: h.createdAt,
                type: 'HOMEWORK',
                targetClassroomId: h.classroomId
            }))
        ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10);

        const sortedCombined = [
            ...schoolEvents.map(e => ({ ...e, sortDate: e.eventDate, uiType: 'EVENT' }))
        ].sort((a, b) => new Date(a.sortDate) - new Date(b.sortDate)).slice(0, 5);

        console.log(`[Dashboard] Sending final response`);
        res.json({
            children: childrenStats,
            upcomingEvents: sortedCombined.map(ev => ({
                id: ev.uiType === 'MEETING' ? `meeting-${ev.id}` : `event-${ev.id}`,
                title: ev.title,
                date: dayjs(ev.sortDate).format('MMM DD'),
                time: ev.uiType === 'MEETING' ? (ev.preferredTime || 'TBD') : (ev.startTime || 'All Day'),
                type: ev.uiType,
                description: ev.description,
                location: ev.location,
                mediaUrl: ev.mediaUrl,
                event_media: ev.event_media || [],
                eventDate: ev.eventDate,
                startTime: ev.startTime,
                endTime: ev.endTime,
                classrooms: ev.classrooms
            })),
            updates: combinedUpdates.map(u => ({
                id: u.id,
                title: u.title,
                message: u.message,
                date: dayjs(u.createdAt).fromNow(),
                type: u.type,
                targetClassroomId: u.targetClassroomId,
                targetRole: u.targetRole,
                targetParentId: u.targetParentId
            })),
            profile: {
                fullName: parent.fullName,
                email: parent.email,
                phone: parent.phone,
                nic: parent.nationalId,
                address: parent.address,
                relationship: parent.relationship
            }
        });

    } catch (error) {
        console.error('[Dashboard] Error in getParentStats:', error);
        next(error);
    }
};
