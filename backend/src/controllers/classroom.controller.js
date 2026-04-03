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
                where: { teacherId: req.user.id },
                include: { classrooms: true }
            });

            if (!teacherProfile || !teacherProfile.classrooms || teacherProfile.classrooms.length === 0) {
                return res.json([]);
            }
            // Filter by all assigned classrooms
            where.id = { in: teacherProfile.classrooms.map(c => c.id) };
        }

        const classrooms = await prisma.classroom.findMany({
            where: where,
            include: {
                student: { select: { id: true, fullName: true, photoUrl: true } },
                teacherprofiles: {
                    include: { user: { select: { fullName: true } } }
                }
            },
            orderBy: { createdAt: 'desc' },
        });

        const formattedClassrooms = classrooms.map(c => ({
            ...c,
            teacherProfiles: c.teacherprofiles,
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
                where: { teacherId: req.user.id },
                include: { classrooms: true }
            });

            const isAssigned = teacherProfile?.classrooms.some(c => c.id === classroomId);

            if (!isAssigned) {
                return res.status(403).json({ message: 'Forbidden: You only have access to your assigned classroom' });
            }
        }

        const classroom = await prisma.classroom.findUnique({
            where: { id: classroomId },
            include: {
                student: true,
                teacherprofiles: { include: { user: true } }
            }
        });
        if (!classroom) return res.status(404).json({ message: 'Classroom not found' });

        const formattedClassroom = {
            ...classroom,
            teacherProfiles: classroom.teacherprofiles,
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
        
        // Task 5: If mealPlan is updated, create an announcement for classroom parents
        if (req.body.mealPlan) {
            await prisma.notification.create({
                data: {
                    title: `Meal Plan Updated: ${classroom.name}`,
                    message: `A new meal plan has been updated for your child's classroom. Please check the meal plan section in the app.`,
                    targetRole: 'PARENT',
                    targetClassroomId: classroom.id,
                    createdById: req.user.id
                }
            });
        }

        res.json(classroom);
    } catch (error) {
        next(error);
    }
};

exports.assignTeacher = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { teacherId, designation } = req.body;

        const classroomId = parseInt(id);

        const currentClassroom = await prisma.classroom.findUnique({
            where: { id: classroomId },
            include: { teacherprofiles: true }
        });
        if (!currentClassroom) return res.status(404).json({ message: 'Classroom not found' });

        // Check if teacher is already assigned to max 3 classrooms
        const teacherProfile = await prisma.teacherprofile.findUnique({
            where: { teacherId: parseInt(teacherId) },
            include: { classrooms: true }
        });

        if (teacherProfile && teacherProfile.classrooms.length >= 3) {
            // Check if already assigned to THIS classroom
            const isAssigned = teacherProfile.classrooms.some(c => c.id === classroomId);
            if (!isAssigned) {
                return res.status(400).json({ message: 'Teacher is already assigned to the maximum of 3 classrooms.' });
            }
        }

        // If setting as LEAD, check if one already exists
        if (designation === 'LEAD') {
            const existingLead = currentClassroom.teacherprofiles.find(tp => tp.designation === 'LEAD');
            if (existingLead && existingLead.teacherId !== parseInt(teacherId)) {
                // Demote existing lead to assistant
                await prisma.teacherprofile.update({
                    where: { teacherId: existingLead.teacherId },
                    data: { designation: 'ASSISTANT' }
                });
            }
        }

        const profile = await prisma.teacherprofile.upsert({
            where: { teacherId: parseInt(teacherId) },
            update: {
                designation: designation || 'ASSISTANT',
                classrooms: {
                    connect: { id: classroomId }
                }
            },
            create: {
                teacherId: parseInt(teacherId),
                designation: designation || 'ASSISTANT',
                classrooms: {
                    connect: { id: classroomId }
                }
            }
        });

        res.json({ message: 'Teacher assigned to classroom successfully', profile });
    } catch (error) {
        next(error);
    }
};
