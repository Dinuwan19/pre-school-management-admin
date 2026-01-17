const prisma = require('../config/prisma');
const { logAction } = require('../services/audit.service');

exports.createClassroom = async (req, res, next) => {
    try {
        const { name, ageGroup, capacity, mealPlan } = req.body;
        const classroom = await prisma.classroom.create({
            data: {
                name,
                ageGroup,
                capacity: parseInt(capacity),
                mealPlan,
                status: 'ACTIVE'
            },
        });

        await logAction(req.user?.id || 1, `CREATE_CLASSROOM: Created classroom ${classroom.name}`);

        res.status(201).json(classroom);
    } catch (error) {
        next(error);
    }
};

exports.getAllClassrooms = async (req, res, next) => {
    try {
        let where = { status: 'ACTIVE' };

        if (req.user.role === 'TEACHER') {
            const teacherProfile = await prisma.teacherprofile.findUnique({
                where: { teacherId: req.user.id }
            });

            if (!teacherProfile || !teacherProfile.assignedClassroomId) {
                return res.json([]);
            }
            where.id = teacherProfile.assignedClassroomId;
        }

        const classrooms = await prisma.classroom.findMany({
            where: where,
            include: {
                student: { select: { id: true, fullName: true, photoUrl: true } },
                teacherprofile: {
                    include: { user: { select: { fullName: true } } }
                }
            },
            orderBy: { createdAt: 'desc' },
        });

        const formattedClassrooms = classrooms.map(c => ({
            ...c,
            teacherProfiles: c.teacherprofile,
            students: c.student
        }));

        res.json(formattedClassrooms);
    } catch (error) {
        next(error);
    }
};

exports.getClassroomById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const classroomId = parseInt(id);

        if (req.user.role === 'TEACHER') {
            const teacherProfile = await prisma.teacherprofile.findUnique({
                where: { teacherId: req.user.id }
            });
            if (!teacherProfile || teacherProfile.assignedClassroomId !== classroomId) {
                return res.status(403).json({ message: 'Forbidden: You only have access to your assigned classroom' });
            }
        }

        const classroom = await prisma.classroom.findUnique({
            where: { id: classroomId },
            include: {
                student: true,
                teacherprofile: { include: { user: true } }
            }
        });
        if (!classroom) return res.status(404).json({ message: 'Classroom not found' });

        const formattedClassroom = {
            ...classroom,
            teacherProfiles: classroom.teacherprofile,
            students: classroom.student
        };

        res.json(formattedClassroom);
    } catch (error) {
        next(error);
    }
};

exports.updateClassroom = async (req, res, next) => {
    try {
        const { id } = req.params;
        const classroom = await prisma.classroom.update({
            where: { id: parseInt(id) },
            data: {
                ...req.body,
                capacity: req.body.capacity ? parseInt(req.body.capacity) : undefined
            },
        });

        await logAction(req.user.id, `UPDATE_CLASSROOM: Updated classroom ${classroom.name}`);

        res.json(classroom);
    } catch (error) {
        next(error);
    }
};

exports.assignTeacher = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { teacherId } = req.body;

        const classroom = await prisma.classroom.findUnique({
            where: { id: parseInt(id) },
            include: { teacherprofile: true }
        });
        if (!classroom) return res.status(404).json({ message: 'Classroom not found' });

        if (classroom.teacherprofile.length >= 3) {
            return res.status(400).json({ message: 'Maximum of 3 teachers allowed per classroom' });
        }

        const profile = await prisma.teacherprofile.upsert({
            where: { teacherId: parseInt(teacherId) },
            update: { assignedClassroomId: parseInt(id) },
            create: {
                teacherId: parseInt(teacherId),
                assignedClassroomId: parseInt(id)
            }
        });

        res.json({ message: 'Teacher assigned successfully', profile });
    } catch (error) {
        next(error);
    }
};
