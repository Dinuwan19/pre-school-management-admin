const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { logAction } = require('../services/audit.service');

const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '30d' } // Longer session for parents
    );
};

exports.parentSignup = async (req, res, next) => {
    try {
        const { nationalId, email, password, username } = req.body;

        // 1. Verify parent exists in our records via NIC only (Email check removed as requested)
        const parentRecord = await prisma.parent.findFirst({
            where: {
                nationalId: nationalId,
                status: 'ACTIVE'
            }
        });

        if (!parentRecord) {
            return res.status(404).json({
                message: 'No active parent record found with this NIC. Please contact school admin.'
            });
        }

        // 2. Check if this parent already has a user account linked
        if (parentRecord.userId) {
            return res.status(400).json({
                message: 'A user account already exists for this parent. Please login instead.'
            });
        }

        // 3. Check if username is taken
        const existingUser = await prisma.user.findUnique({ where: { username } });
        if (existingUser) {
            return res.status(400).json({ message: 'Username is already taken' });
        }

        // 4. Create User Record
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await prisma.user.create({
            data: {
                username,
                password: hashedPassword,
                role: 'PARENT',
                fullName: parentRecord.fullName,
                email: parentRecord.email,
                phone: parentRecord.phone,
                status: 'ACTIVE',
                firstLogin: false
            }
        });

        // 5. Link User to Parent
        await prisma.parent.update({
            where: { id: parentRecord.id },
            data: { userId: newUser.id }
        });

        const token = generateToken(newUser);

        res.status(201).json({
            message: 'Parent account created successfully',
            token,
            user: {
                id: newUser.id,
                username: newUser.username,
                role: 'PARENT',
                fullName: newUser.fullName,
                parentId: parentRecord.id
            }
        });

        await logAction(newUser.id, `PARENT_SIGNUP: Account created via NIC ${nationalId}`);

    } catch (error) {
        next(error);
    }
};

exports.getLinkedChildren = async (req, res, next) => {
    try {
        const userId = req.user.id;

        // Find parent record linked to this user
        const parentRecord = await prisma.parent.findUnique({
            where: { userId: userId },
            include: {
                student_student_parentIdToparent: {
                    include: {
                        classroom: {
                            include: {
                                teacherprofile: {
                                    where: { designation: 'LEAD' },
                                    include: { user: true }
                                }
                            }
                        },
                        attendance: {
                            orderBy: { attendanceDate: 'desc' },
                            take: 1
                        },
                        studentprogress: {
                            orderBy: { updatedAt: 'desc' },
                            take: 1
                        }
                    }
                }
            }
        });

        if (!parentRecord) {
            return res.status(404).json({ message: 'Parent profile not found' });
        }

        const children = parentRecord.student_student_parentIdToparent.map(child => ({
            id: child.id,
            studentUniqueId: child.studentUniqueId,
            fullName: child.fullName,
            photoUrl: child.photoUrl,
            classroom: child.classroom?.name,
            teacherName: child.classroom?.teacherprofile?.[0]?.user?.fullName || 'N/A',
            lastAttendance: child.attendance[0],
            latestProgress: child.studentprogress[0]
        }));

        res.json(children);
    } catch (error) {
        next(error);
    }
};

exports.getParentBillings = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const parentRecord = await prisma.parent.findUnique({ where: { userId } });

        const students = await prisma.student.findMany({
            where: { parentId: parentRecord.id },
            select: { id: true, fullName: true }
        });

        const studentIds = students.map(s => s.id);

        const billings = await prisma.billing.findMany({
            where: { studentId: { in: studentIds } },
            include: { student: { select: { fullName: true } } },
            orderBy: { billingMonth: 'desc' }
        });

        res.json(billings);
    } catch (error) {
        next(error);
    }
};

exports.getParentProfile = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const parent = await prisma.parent.findUnique({
            where: { userId },
            include: { user: { select: { username: true } } }
        });
        if (!parent) return res.status(404).json({ message: 'Profile not found' });
        res.json(parent);
    } catch (error) {
        next(error);
    }
};

exports.updateParentProfile = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { fullName, phone, email, address, occupation, photoUrl } = req.body;

        const parent = await prisma.parent.findUnique({ where: { userId } });
        if (!parent) return res.status(404).json({ message: 'Profile not found' });

        const updated = await prisma.parent.update({
            where: { id: parent.id },
            data: { fullName, phone, email, address, occupation, photoUrl }
        });

        // Also sync basic info to User record
        await prisma.user.update({
            where: { id: userId },
            data: {
                fullName: fullName || undefined,
                email: email || undefined,
                phone: phone || undefined
            }
        });

        res.json(updated);
    } catch (error) {
        next(error);
    }
};
