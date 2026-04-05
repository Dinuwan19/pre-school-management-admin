const prisma = require('../config/prisma');
const { sendPushNotification } = require('../utils/push.utils');

exports.createNotification = async (req, res, next) => {
    try {
        const { title, message, targetRole, targetClassroomId } = req.body;
        const createdById = req.user.id;

        // Scoping for Teacher/Staff
        let finalTargetClassroomId = targetClassroomId ? parseInt(targetClassroomId) : null;

        if (req.classroomScope) {
            // Strict check: Teachers can ONLY send to PARENT role (parents of their classrooms)
            if (targetRole && targetRole !== 'PARENT') {
                return res.status(403).json({ message: 'Forbidden: Teachers can only send announcements to Parents.' });
            }

            // Case 1: No targetClassroomId provided
            if (!finalTargetClassroomId) {
                if (req.classroomScope.length === 1) {
                    finalTargetClassroomId = req.classroomScope[0];
                } else {
                    return res.status(400).json({ message: 'Teacher is assigned to multiple classrooms. Please specify a targetClassroomId.' });
                }
            } else {
                // Case 2: targetClassroomId provided, but must be in scope
                if (!req.classroomScope.includes(finalTargetClassroomId)) {
                    return res.status(403).json({ message: 'Forbidden: You are not assigned to this classroom.' });
                }
            }
        } else if (req.user.role === 'TEACHER') {
            return res.status(403).json({ message: 'Access denied: No classroom assigned to send notifications.' });
        }

        const notification = await prisma.notification.create({
            data: {
                title,
                message,
                targetRole: targetRole || 'PARENT',
                targetClassroomId: finalTargetClassroomId,
                createdById
            },
            include: {
                user_notification_createdByIdTouser: {
                    select: { fullName: true }
                }
            }
        });

        // Background Push Trigger
        (async () => {
            try {
                let targetUsers = [];
                if (finalTargetClassroomId) {
                    targetUsers = await prisma.user.findMany({
                        where: {
                            role: 'PARENT',
                            parent: {
                                OR: [
                                    { student_student_parentIdToparent: { some: { classroomId: finalTargetClassroomId } } },
                                    { student_student_secondParentIdToparent: { some: { classroomId: finalTargetClassroomId } } }
                                ]
                            },
                            pushToken: { not: null }
                        },
                        select: { pushToken: true }
                    });
                } else if (targetRole === 'PARENT' || targetRole === 'ALL') {
                    targetUsers = await prisma.user.findMany({
                        where: { 
                            role: 'PARENT', 
                            pushToken: { not: null } 
                        },
                        select: { pushToken: true }
                    });
                }

                const tokens = targetUsers.map(u => u.pushToken);
                await sendPushNotification(tokens, title, message, { notificationId: notification.id });
            } catch (err) {
                console.error('Push Notification Error:', err);
            }
        })();

        res.status(201).json(notification);
    } catch (error) {
        next(error);
    }
};

exports.getAllNotifications = async (req, res, next) => {
    try {
        const { role, id, username } = req.user;

        // Filter based on role
        let where = {};
        if (req.classroomScope) {
            // Teachers see notifications for their classrooms or their own creations
            where = {
                OR: [
                    { targetClassroomId: { in: req.classroomScope } },
                    { createdById: id },
                    { targetRole: 'TEACHER' },
                    { targetRole: 'ALL' }
                ]
            };
        } else if (role === 'TEACHER') {
            // Teacher with no classroom sees only their own
            where = { createdById: id };
        } else if (role === 'PARENT') {
            const parent = await prisma.parent.findFirst({
                where: {
                    OR: [
                        { userId: id },
                        { email: username }
                    ]
                },
                include: {
                    student_student_parentIdToparent: { select: { classroomId: true } },
                    student_student_secondParentIdToparent: { select: { classroomId: true } }
                }
            });

            let classroomIds = [];
            if (parent) {
                classroomIds = [
                    ...(parent.student_student_parentIdToparent || []).map(s => s.classroomId),
                    ...(parent.student_student_secondParentIdToparent || []).map(s => s.classroomId)
                ];
            }

            if (classroomIds.length === 0) {
                return res.json([]);
            }

            where = {
                OR: [
                    { targetRole: 'ALL' },
                    { targetRole: 'PARENT', targetParentId: null },
                    { targetParentId: id },
                    { targetClassroomId: { in: classroomIds } }
                ]
            };
        }
        // ADMIN/SUPER_ADMIN see all by default (empty where)

        const notifications = await prisma.notification.findMany({
            where,
            include: {
                user_notification_createdByIdTouser: {
                    select: { fullName: true }
                },
                classroom: {
                    select: { name: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // For Parents, we also want to show Homework as announcements
        let extraUpdates = [];
        if (role === 'PARENT' && where.OR) {
            // Find classroomIds from the 'where' clause we just built or re-extract
            const classroomTarget = where.OR.find(o => o.targetClassroomId);
            const classroomIds = classroomTarget ? (classroomTarget.targetClassroomId.in || []) : [];

            if (classroomIds.length > 0) {
                const homework = await prisma.homework.findMany({
                    where: { classroomId: { in: classroomIds } },
                    take: 20,
                    orderBy: { createdAt: 'desc' },
                    include: { user: { select: { fullName: true } } }
                });

                extraUpdates = homework.map(h => ({
                    id: `hw-${h.id}`,
                    title: `Homework: ${h.title}`,
                    message: h.description,
                    createdAt: h.createdAt,
                    type: 'HOMEWORK',
                    targetClassroomId: h.classroomId,
                    user_notification_createdByIdTouser: h.user
                }));
            }
        }

        // Map results to standard format and combine
        const formattedNotifications = [
            ...notifications.map(n => {
                const isFee = n.title?.toLowerCase().includes('fee') ||
                    n.message?.toLowerCase().includes('fee') ||
                    n.title?.toLowerCase().includes('payment') ||
                    n.message?.toLowerCase().includes('payment');

                return {
                    ...n,
                    createdBy: n.user_notification_createdByIdTouser,
                    type: isFee ? 'ALERT' : 'NOTICE'
                };
            }),
            ...extraUpdates.map(u => ({ ...u, type: 'HOMEWORK' }))
        ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json(formattedNotifications);
    } catch (error) {
        next(error);
    }
};

exports.deleteNotification = async (req, res, next) => {
    try {
        const { id } = req.params;
        await prisma.notification.delete({ where: { id: parseInt(id) } });
        res.json({ message: 'Notification deleted' });
    } catch (error) {
        next(error);
    }
};
