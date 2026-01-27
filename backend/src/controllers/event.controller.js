const prisma = require('../config/prisma');

exports.createEvent = async (req, res, next) => {
    try {
        const { title, description, eventDate, startTime, endTime, location } = req.body;
        const isTeacher = req.user.role === 'TEACHER' || req.user.role === 'STAFF';

        const event = await prisma.event.create({
            data: {
                title,
                description,
                eventDate: new Date(eventDate),
                startTime,
                endTime,
                location,
                status: isTeacher ? 'PENDING' : 'UPCOMING',
                createdById: req.user.id
            }
        });

        res.status(201).json(event);
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
        await prisma.event.updateMany({
            where: { eventDate: { lt: now }, status: 'UPCOMING' },
            data: { status: 'COMPLETED' }
        });

        if (status && status !== 'All Events') {
            where.status = status.toUpperCase();
        }

        const events = await prisma.event.findMany({
            where,
            include: {
                _count: {
                    select: { event_attendance: true }
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
                }
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
        const { status } = req.body;
        const event = await prisma.event.update({
            where: { id: parseInt(id) },
            data: { status }
        });
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
