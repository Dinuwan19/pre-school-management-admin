const prisma = require('../config/prisma');

exports.createHomework = async (req, res, next) => {
    try {
        const { title, description, dueDate, classroomId } = req.body;
        const createdById = req.user.id;

        // Scoping for Teacher/Staff
        let finalClassroomId = classroomId ? parseInt(classroomId) : null;

        if (req.classroomScope) {
            // Case 1: No classroomId provided
            if (!finalClassroomId) {
                if (req.classroomScope.length === 1) {
                    finalClassroomId = req.classroomScope[0];
                } else {
                    return res.status(400).json({ message: 'Teacher is assigned to multiple classrooms. Please specify a classroomId.' });
                }
            } else {
                // Case 2: ClassroomId provided, but must be in scope
                if (!req.classroomScope.includes(finalClassroomId)) {
                    return res.status(403).json({ message: 'Forbidden: You are not assigned to this classroom.' });
                }
            }
        } else if (req.user.role === 'TEACHER' || req.user.role === 'STAFF') {
            return res.status(403).json({ message: 'Access denied: No classroom assigned to create homework.' });
        }

        const homework = await prisma.homework.create({
            data: {
                title,
                description,
                dueDate: dueDate ? new Date(dueDate) : null,
                classroomId: finalClassroomId,
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

        if (req.classroomScope) {
            where = { classroomId: { in: req.classroomScope } };
        } else if (role === 'TEACHER' || role === 'STAFF') {
            return res.json([]); // No classroom assigned
        } else if (role === 'PARENT') {
            const { id, username } = req.user;
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

            if (parent) {
                const classroomIds = [
                    ...(parent.student_student_parentIdToparent || []).map(s => s.classroomId),
                    ...(parent.student_student_secondParentIdToparent || []).map(s => s.classroomId)
                ];
                where = { classroomId: { in: classroomIds } };
            } else {
                return res.json([]);
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
