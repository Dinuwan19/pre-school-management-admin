const prisma = require('../config/prisma');
const { logAction } = require('../services/audit.service');

exports.requestMeeting = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { studentId, title, description, requestDate, preferredTime } = req.body;

        const parentRecord = await prisma.parent.findUnique({
            where: { userId: userId }
        });

        if (!parentRecord) {
            return res.status(404).json({ message: 'Parent profile not found' });
        }

        // Find the teacher for the child's classroom
        const student = await prisma.student.findUnique({
            where: { id: studentId },
            include: {
                classroom: {
                    include: {
                        teacherprofile: {
                            where: { designation: 'LEAD' }
                        }
                    }
                }
            }
        });

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const teacherId = student.classroom?.teacherprofile[0]?.teacherId;

        const meeting = await prisma.meeting_request.create({
            data: {
                parentId: parentRecord.id,
                teacherId: teacherId,
                studentId: studentId,
                title,
                description,
                requestDate: new Date(requestDate),
                preferredTime,
                status: 'PENDING'
            }
        });

        res.status(201).json({ message: 'Meeting requested successfully', meeting });
        await logAction(userId, `MEETING_REQUESTED: Parent ${parentRecord.fullName} for student ${student.fullName}`);

    } catch (error) {
        next(error);
    }
};

exports.getParentMeetings = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const parentRecord = await prisma.parent.findUnique({ where: { userId } });

        const meetings = await prisma.meeting_request.findMany({
            where: { parentId: parentRecord.id },
            include: {
                student: { select: { fullName: true } },
                teacher: { select: { fullName: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(meetings);
    } catch (error) {
        next(error);
    }
};

exports.getTeacherMeetings = async (req, res, next) => {
    try {
        const teacherId = req.user.id;

        const meetings = await prisma.meeting_request.findMany({
            where: { teacherId: teacherId },
            include: {
                student: { select: { fullName: true } },
                parent: { select: { fullName: true, phone: true } }
            },
            orderBy: { requestDate: 'asc' }
        });

        res.json(meetings);
    } catch (error) {
        next(error);
    }
};

exports.updateMeetingStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const meeting = await prisma.meeting_request.update({
            where: { id: parseInt(id) },
            data: { status }
        });

        res.json({ message: `Meeting status updated to ${status}`, meeting });
        await logAction(req.user.id, `MEETING_STATUS_UPDATE: Meeting ${id} changed to ${status}`);
    } catch (error) {
        next(error);
    }
};
