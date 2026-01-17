const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');
const { logAction } = require('../services/audit.service');

exports.createParent = async (req, res, next) => {
    try {
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

        // Data Scoping for Teacher
        if (req.user.role === 'TEACHER') {
            const teacherProfile = await prisma.teacherProfile.findUnique({
                where: { teacherId: req.user.id }
            });

            if (!teacherProfile || !teacherProfile.assignedClassroomId) {
                return res.json([]); // No classroom assigned, no parents visible
            }

            // Filter parents who have students in the teacher's classroom (Primary or Secondary)
            const classroomId = teacherProfile.assignedClassroomId;
            where.OR = [
                { student_student_parentIdToparent: { some: { classroomId } } },
                { student_student_secondParentIdToparent: { some: { classroomId } } }
            ];
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

        // Flatten student lists for frontend convenience
        const students = [...(parent.student_student_parentIdToparent || []), ...(parent.student_student_secondParentIdToparent || [])];
        res.json({ ...parent, students });
    } catch (error) {
        next(error);
    }
};

exports.updateParent = async (req, res) => {
    try {
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

exports.deleteParent = async (req, res) => {
    try {
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
