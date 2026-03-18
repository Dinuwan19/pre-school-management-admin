const prisma = require('../config/prisma');
const { uploadFile } = require('../services/storage.service');
const auditService = require('../services/audit.service');

exports.createEvent = async (req, res, next) => {
    try {
        const { title, description, eventDate, startTime, endTime, location, targetClassroomIds } = req.body;
        const isTeacher = req.user.role === 'TEACHER';

        // If Teacher, status is PENDING. If Admin, status is UPCOMING (Published).
        const status = isTeacher ? 'PENDING' : 'UPCOMING';

        let mediaUrl = req.body.mediaUrl;
        if (req.file) {
            mediaUrl = await uploadFile(req.file, 'events');
        } else if (req.files && req.files.length > 0) {
            // Handle array if configured as array (usually single 'media')
            mediaUrl = await uploadFile(req.files[0], 'events');
        } else if (req.files && req.files['media']) {
            mediaUrl = await uploadFile(req.files['media'][0], 'events');
        }

        let classroomConnect = {};
        if (targetClassroomIds) {
            let ids = Array.isArray(targetClassroomIds) ? targetClassroomIds : [targetClassroomIds];
            // Filter out 'all' or empty
            ids = ids.filter(id => id !== 'all' && id !== '');
            if (ids.length > 0) {
                classroomConnect = {
                    classrooms: {
                        connect: ids.map(id => ({ id: parseInt(id) }))
                    }
                };
            }
        }

        const event = await prisma.event.create({
            data: {
                title,
                description,
                eventDate: new Date(eventDate),
                startTime,
                endTime,
                location,
                mediaUrl,
                status,
                createdById: req.user.id,
                ...classroomConnect
            }
        });

        // Log action
        const auditService = require('../services/audit.service');
        auditService.logAction(req.user.id, 'CREATE_EVENT', `EventID: ${event.id}, Status: ${status}`);

        res.status(201).json(event);
    } catch (error) {
        next(error);
    }
};

exports.approveEvent = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Only Super Admin or Admin can approve
        if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Only Admins can approve events.' });
        }

        const event = await prisma.event.update({
            where: { id: parseInt(id) },
            data: { status: 'UPCOMING' } // UPCOMING = Published/Approved
        });

        const auditService = require('../services/audit.service');
        auditService.logAction(req.user.id, 'APPROVE_EVENT', `EventID: ${event.id}`);

        res.json(event);
    } catch (error) {
        next(error);
    }
};

exports.getAllEvents = async (req, res, next) => {
    try {
        const { status } = req.query;
        let where = {};

        // Auto-update statuses based on date before fetching
        // In production, a CRON job is better, but this ensures consistency on fetch
        const now = new Date();
        const startOfToday = new Date(now.setHours(0, 0, 0, 0));

        await prisma.event.updateMany({
            where: { eventDate: { lt: startOfToday }, status: 'UPCOMING' },
            data: { status: 'COMPLETED' }
        });

        if (status && status !== 'All Events' && status !== 'ALL') {
            where.status = status.toUpperCase();
        } else if (req.user.role === 'PARENT') {
            const { id, username } = req.user;
            // Check if parent has any active children
            const parent = await prisma.parent.findFirst({
                where: { OR: [{ userId: id }, { email: username }] },
                include: {
                    student_student_parentIdToparent: { where: { status: 'ACTIVE' } },
                    student_student_secondParentIdToparent: { where: { status: 'ACTIVE' } }
                }
            });

            const activeChildren = [
                ...(parent?.student_student_parentIdToparent || []),
                ...(parent?.student_student_secondParentIdToparent || [])
            ];

            if (activeChildren.length === 0) {
                return res.json([]);
            }

            // If status is ALL, show everything. Otherwise default to valid statuses.
            if (status === 'ALL') {
                where.status = { in: ['UPCOMING', 'COMPLETED', 'PUBLISHED', 'APPROVED'] };
            } else {
                where.status = { in: ['UPCOMING', 'PUBLISHED', 'APPROVED'] };
            }
        }

        const events = await prisma.event.findMany({
            where,
            include: {
                _count: {
                    select: { event_attendance: true }
                },
                user: {
                    select: { fullName: true }
                },
                event_media: true,
                classrooms: {
                    select: { id: true, name: true }
                }
            },
            orderBy: { eventDate: 'desc' }
        });

        const formattedEvents = events.map(e => ({
            ...e,
            attendees: e._count.event_attendance
        }));

        res.json(formattedEvents);
    } catch (error) {
        next(error);
    }
};

exports.getEventById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const event = await prisma.event.findUnique({
            where: { id: parseInt(id) },
            include: {
                event_attendance: {
                    include: { student: { select: { fullName: true, studentUniqueId: true } } }
                },
                event_media: true
            }
        });
        if (!event) return res.status(404).json({ message: 'Event not found' });
        res.json(event);
    } catch (error) {
        next(error);
    }
};

exports.updateEventStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { title, description, eventDate, startTime, endTime, location, status } = req.body;

        const updateData = {};
        if (title) updateData.title = title;
        if (description) updateData.description = description;
        if (eventDate) updateData.eventDate = new Date(eventDate);
        if (startTime) updateData.startTime = startTime;
        if (endTime) updateData.endTime = endTime;
        if (location) updateData.location = location;
        if (status) updateData.status = status;

        const event = await prisma.event.update({
            where: { id: parseInt(id) },
            data: updateData
        });

        // Log action if status changed
        if (status) {
            const auditService = require('../services/audit.service');
            auditService.logAction(req.user.id, 'UPDATE_EVENT_STATUS', `EventID: ${id}, Status: ${status}`);
        }

        res.json(event);
    } catch (error) {
        next(error);
    }
};

exports.addToWaitingList = async (req, res, next) => {
    try {
        const { eventId, studentId } = req.body;
        const entry = await prisma.event_waiting_list.create({
            data: {
                eventId: parseInt(eventId),
                studentId: parseInt(studentId)
            }
        });
        res.json(entry);
    } catch (error) {
        next(error);
    }
};

exports.getWaitingList = async (req, res, next) => {
    try {
        const list = await prisma.event_waiting_list.findMany({
            where: { status: 'PENDING' },
            include: {
                student: { select: { fullName: true } },
                event: { select: { title: true, eventDate: true, startTime: true, endTime: true } }
            }
        });
        res.json(list);
    } catch (error) {
        next(error);
    }
};

exports.approveWaitingList = async (req, res, next) => {
    try {
        const { id } = req.params;
        const item = await prisma.event_waiting_list.update({
            where: { id: parseInt(id) },
            data: { status: 'APPROVED' }
        });

        // Add to main attendance as well
        await prisma.event_attendance.create({
            data: {
                eventId: item.eventId,
                studentId: item.studentId,
                status: 'PRESENT'
            }
        });

        res.json(item);
    } catch (error) {
        next(error);
    }
};

exports.uploadEventMedia = async (req, res, next) => {
    try {
        const { id } = req.params;
        const eventId = parseInt(id);

        if (!req.files || !req.files['media']) {
            return res.status(400).json({ message: 'No media files uploaded' });
        }

        const files = req.files['media'];
        const uploadPromises = files.map(async (file) => {
            const url = await uploadFile(file, 'events');
            // Determine type based on mimetype
            const type = file.mimetype.startsWith('image/') ? 'IMAGE' : 'FILE';

            return prisma.event_media.create({
                data: {
                    eventId,
                    url,
                    type
                }
            });
        });

        const uploadedMedia = await Promise.all(uploadPromises);

        // Update event status to COMPLETED if not already
        await prisma.event.update({
            where: { id: eventId },
            data: { status: 'COMPLETED' }
        });

        res.status(201).json({
            message: `${uploadedMedia.length} files uploaded successfully`,
            media: uploadedMedia
        });
    } catch (error) {
        next(error);
    }
};

exports.deleteEventMedia = async (req, res, next) => {
    try {
        const { id } = req.params;
        await prisma.event_media.delete({
            where: { id: parseInt(id) }
        });
        res.json({ message: 'Media deleted successfully' });
    } catch (error) {
        next(error);
    }
};
