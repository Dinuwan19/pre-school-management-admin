const prisma = require('../config/prisma');

exports.createNotification = async (req, res, next) => {
    try {
        const { title, message, targetRole, targetClassroomId } = req.body;
        const createdById = req.user.id;

        const notification = await prisma.notification.create({
            data: {
                title,
                message,
                targetRole,
                targetClassroomId: targetClassroomId ? parseInt(targetClassroomId) : null,
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
        if (role === 'TEACHER') {
            // Teachers see ALL or TEACHER target notifications
            where = {
                OR: [
                    { targetRole: 'ALL' },
                    { targetRole: 'TEACHER' },
                    { createdById: id } // Their own
                ]
            };
        } else if (role === 'PARENT') {
            where = {
                OR: [
                    { targetRole: 'ALL' },
                    { targetRole: 'PARENT' }
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
