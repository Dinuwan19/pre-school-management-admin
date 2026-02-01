const prisma = require('../config/prisma');

exports.createNotification = async (req, res, next) => {
    try {
        const { title, message, targetRole, targetClassroomId } = req.body;
        const createdById = req.user.id;

        // Scoping for Teacher/Staff
        let finalTargetClassroomId = targetClassroomId ? parseInt(targetClassroomId) : null;
        if (req.classroomScope) {
            finalTargetClassroomId = req.classroomScope;
        } else if (req.user.role === 'TEACHER' || req.user.role === 'STAFF') {
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

        res.status(201).json(notification);
    } catch (error) {
        next(error);
    }
};

exports.getAllNotifications = async (req, res, next) => {
    try {
        const { role, id } = req.user;

        // Filter based on role
        let where = {};
        if (req.classroomScope) {
            // Teachers see notifications for their classroom or their own creations
            where = {
                OR: [
                    { targetClassroomId: req.classroomScope },
                    { createdById: id },
                    { targetRole: 'TEACHER' },
                    { targetRole: 'ALL' }
                ]
            };
        } else if (role === 'TEACHER' || role === 'STAFF') {
            // Teacher with no classroom sees only their own
            where = { createdById: id };
        } else if (role === 'PARENT') {
            const parent = await prisma.parent.findFirst({
                where: { email: req.user.username },
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

            where = {
                OR: [
                    { targetRole: 'ALL' },
                    // Fix: Only show PARENT notifications if they are Global (null target) OR targeted to this user
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

        // Map results to standard format
        const formattedNotifications = notifications.map(n => ({
            ...n,
            createdBy: n.user_notification_createdByIdTouser
        }));

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
