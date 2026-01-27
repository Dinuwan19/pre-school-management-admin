const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');
const { logAction } = require('../services/audit.service');

exports.createParent = async (req, res, next) => {
    try {
        // Teachers and Staff cannot add parents
        if (req.user.role === 'TEACHER' || req.user.role === 'STAFF') {
            return res.status(403).json({ message: 'Access denied: Teachers and Staff cannot create parent records.' });
        }

        const { relationship, nationalId, occupation, address, phone, email, photoUrl } = req.body;
        const fullName = req.body.fullName.trim();

        // Auto-Generate Parent ID
        const count = await prisma.parent.count();
        const parentUniqueId = `P${(count + 1).toString().padStart(4, '0')}`; // P0001, P0002...

        // Generate a 6-digit verification code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        const parent = await prisma.parent.create({
            data: {
                fullName,
                parentUniqueId,
                relationship,
                nationalId,
                occupation,
                address,
                phone,
                email: email || null,
                photoUrl,
                verificationCode,
                status: 'ACTIVE'
            },
        });

        // Create a User record for the parent if email exists, allowing them to log in
        if (email) {
            const hashedPassword = await bcrypt.hash(verificationCode, 10);
            await prisma.user.create({
                data: {
                    username: email,
                    password: hashedPassword,
                    role: 'PARENT',
                    fullName: fullName,
                    status: 'ACTIVE',
                    firstLogin: true
                }
            });
        }

        await logAction(req.user?.id || 1, `CREATE_PARENT: Created parent ${parent.parentUniqueId}`);

        res.status(201).json(parent);
    } catch (error) {
        next(error);
    }
};

exports.getAllParents = async (req, res, next) => {
    try {
        let where = { status: 'ACTIVE' };

        // Use classroom scoping from middleware for Teachers/Staff
        if (req.classroomScope) {
            const classroomId = req.classroomScope;
            where.OR = [
                { student_student_parentIdToparent: { some: { classroomId } } },
                { student_student_secondParentIdToparent: { some: { classroomId } } }
            ];
        } else if (req.user.role === 'TEACHER' || req.user.role === 'STAFF') {
            // Teacher with no classroom assigned sees no parents
            return res.json([]);
        }

        const parents = await prisma.parent.findMany({
            where: where,
            include: {
                student_student_parentIdToparent: {
                    select: { id: true, fullName: true, classroomId: true },
                    where: { status: 'ACTIVE' }
                },
                student_student_secondParentIdToparent: {
                    select: { id: true, fullName: true, classroomId: true },
                    where: { status: 'ACTIVE' }
                }
            },
            orderBy: { createdAt: 'desc' },
        });

        // Map results to flatten students for frontend
        const formattedParents = parents.map(p => ({
            ...p,
            students: [
                ...(p.student_student_parentIdToparent || []),
                ...(p.student_student_secondParentIdToparent || [])
            ]
        }));

        res.json(formattedParents);
    } catch (error) {
        next(error);
    }
};

exports.getParentById = async (req, res) => {
    try {
        const { id } = req.params;
        const parent = await prisma.parent.findUnique({
            where: { id: parseInt(id) },
            include: {
                student_student_parentIdToparent: true,
                student_student_secondParentIdToparent: true
            }
        });
        if (!parent) return res.status(404).json({ message: 'Parent not found' });

        // Scoping check for Teacher
        if (req.classroomScope) {
            const classroomId = req.classroomScope;
            const isAuthorized = await prisma.student.findFirst({
                where: {
                    classroomId: classroomId,
                    OR: [
                        { parentId: parent.id },
                        { secondParentId: parent.id }
                    ]
                }
            });
            if (!isAuthorized) {
                return res.status(403).json({ message: 'Forbidden: Parent has no children in your assigned classroom' });
            }
        }

        // Flatten student lists for frontend convenience
        const students = [...(parent.student_student_parentIdToparent || []), ...(parent.student_student_secondParentIdToparent || [])];
        res.json({ ...parent, students });
    } catch (error) {
        next(error);
    }
};

exports.updateParent = async (req, res, next) => {
    try {
        if (req.user.role === 'TEACHER' || req.user.role === 'STAFF') {
            return res.status(403).json({ message: 'Access denied: Teachers and Staff cannot update parent records.' });
        }
        const { id } = req.params;
        const parent = await prisma.parent.update({
            where: { id: parseInt(id) },
            data: req.body,
        });
        res.json(parent);
    } catch (error) {
        next(error);
    }
};

exports.deleteParent = async (req, res, next) => {
    try {
        if (req.user.role === 'TEACHER' || req.user.role === 'STAFF') {
            return res.status(403).json({ message: 'Access denied: Teachers and Staff cannot deactivate parent records.' });
        }
        const { id } = req.params;
        await prisma.parent.update({
            where: { id: parseInt(id) },
            data: { status: 'INACTIVE' },
        });
        res.json({ message: 'Parent deactivated successfully' });
    } catch (error) {
        next(error);
    }
};
