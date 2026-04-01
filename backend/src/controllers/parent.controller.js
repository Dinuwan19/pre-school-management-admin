const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');
const { logAction } = require('../services/audit.service');
const { uploadFile } = require('../services/storage.service');

exports.createParent = async (req, res, next) => {
    try {
        // Teachers and Staff cannot add parents
        if (req.user.role === 'TEACHER') {
            return res.status(403).json({ message: 'Access denied: Teachers cannot create parent records.' });
        }

        const { relationship, nationalId, occupation, address, phone, email } = req.body;
        const fullName = req.body.fullName.trim();

        // 1. Pre-check for duplicate Phone, Email, or National ID
        if (phone || email || nationalId) {
            const existing = await prisma.parent.findFirst({
                where: {
                    OR: [
                        phone ? { phone } : null,
                        email ? { email } : null,
                        nationalId ? { nationalId } : null
                    ].filter(Boolean)
                }
            });

            if (existing) {
                let field = 'record';
                if (existing.phone === phone) field = 'Phone number';
                else if (existing.email === email) field = 'Email';
                else if (existing.nationalId === nationalId) field = 'National ID (NIC)';
                
                return res.status(400).json({ message: `${field} is already associated with another parent.` });
            }
        }

        // 2. Generate unique parent ID based on last existing ID (Race-safe approach)
        const lastParent = await prisma.parent.findFirst({
            orderBy: { parentUniqueId: 'desc' }
        });

        let nextNum = 1;
        if (lastParent && lastParent.parentUniqueId) {
            const lastNum = parseInt(lastParent.parentUniqueId.replace('P', ''));
            if (!isNaN(lastNum)) nextNum = lastNum + 1;
        }
        const parentUniqueId = `P${String(nextNum).padStart(4, '0')}`;

        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        let photoUrl = req.body.photoUrl || null;
        if (req.files && req.files['photo']) {
            photoUrl = await uploadFile(req.files['photo'][0], 'student photos');
        }

        const parent = await prisma.parent.create({
            data: {
                parentUniqueId,
                fullName,
                relationship,
                nationalId,
                occupation,
                phone,
                email,
                address,
                photoUrl,
                verificationCode
            }
        });

        await logAction(req.user?.id || 1, `CREATE_PARENT: Created parent ${parent.parentUniqueId}`);

        res.status(201).json(parent);
    } catch (error) {
        // Handle race conditions for unique parent ID
        if (error.code === 'P2002' && error.meta?.target?.includes('parentUniqueId')) {
            return res.status(409).json({ message: 'A conflict occurred while generating Parent ID. Please try again.' });
        }
        next(error);
    }
};

exports.getAllParents = async (req, res, next) => {
    try {
        let where = { status: 'ACTIVE' };

        // Use classroom scoping from middleware for Teachers/Staff
        if (req.classroomScope) {
            where.OR = [
                { student_student_parentIdToparent: { some: { classroomId: { in: req.classroomScope } } } },
                { student_student_secondParentIdToparent: { some: { classroomId: { in: req.classroomScope } } } }
            ];
        } else if (req.user.role === 'TEACHER') {
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
            const isAuthorized = await prisma.student.findFirst({
                where: {
                    classroomId: { in: req.classroomScope },
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
        if (req.user.role === 'TEACHER') {
            return res.status(403).json({ message: 'Access denied: Teachers cannot update parent records.' });
        }
        const { id } = req.params;
        const data = { ...req.body };

        if (req.files && req.files['photo']) {
            data.photoUrl = await uploadFile(req.files['photo'][0], 'student photos');
        }

        const parent = await prisma.parent.update({
            where: { id: parseInt(id) },
            data: data,
        });
        res.json(parent);
    } catch (error) {
        next(error);
    }
};

exports.deleteParent = async (req, res, next) => {
    try {
        if (req.user.role === 'TEACHER') {
            return res.status(403).json({ message: 'Access denied: Teachers cannot deactivate parent records.' });
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
