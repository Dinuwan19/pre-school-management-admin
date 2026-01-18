const prisma = require('../config/prisma');

exports.createHomework = async (req, res, next) => {
    try {
        const { title, description, dueDate, classroomId } = req.body;
        const createdById = req.user.id;

        const homework = await prisma.homework.create({
            data: {
                title,
                description,
                dueDate: dueDate ? new Date(dueDate) : null,
                classroomId: parseInt(classroomId),
                createdById
            }
        });

        res.status(201).json(homework);
    } catch (error) {
        next(error);
    }
};

exports.getAllHomework = async (req, res, next) => {
    try {
        const { role, id } = req.user;
        let where = {};

        if (role === 'TEACHER') {
            // Find teacher's classroom
            const profile = await prisma.teacherProfile.findUnique({ where: { teacherId: id } });
            if (profile && profile.assignedClassroomId) {
                where = { classroomId: profile.assignedClassroomId };
            } else {
                return res.json([]); // No classroom assigned
            }
        }

        const homework = await prisma.homework.findMany({
            where,
            include: {
                classroom: {
                    select: { name: true }
                },
                user: {
                    select: { fullName: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(homework);
    } catch (error) {
        next(error);
    }
};

exports.deleteHomework = async (req, res, next) => {
    try {
        const { id } = req.params;
        await prisma.homework.delete({ where: { id: parseInt(id) } });
        res.json({ message: 'Homework deleted' });
    } catch (error) {
        next(error);
    }
};
