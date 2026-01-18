const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');
const { logAction } = require('../services/audit.service');

exports.getAllStaff = async (req, res, next) => {
    try {
        const staff = await prisma.user.findMany({
            where: {
                role: { in: ['ADMIN', 'TEACHER'] },
                status: 'ACTIVE'
            },
            include: {
                teacherprofile: {
                    include: { classroom: { select: { name: true } } }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(staff);
    } catch (error) {
        next(error);
    }
};

exports.createStaff = async (req, res, next) => {
    try {
        const { fullName, email, phone, role, address, nationalId, joiningDate, classroomId, qualification, designation } = req.body;

        const prefix = role === 'TEACHER' ? 'T' : 'A';
        const count = await prisma.user.count({ where: { role: role } });
        const employeeId = `${prefix}${(count + 1).toString().padStart(3, '0')}`;

        const cleanName = fullName.trim();
        const username = cleanName.toLowerCase().split(/\s+/).join('.') + Math.floor(Math.random() * 100);
        const tempPassword = cleanName.split(/\s+/)[0].toLowerCase() + '@123';
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        // Handle uploaded files
        let photoUrl = req.body.photoUrl;
        let qualificationPdf = null;

        if (req.files) {
            if (req.files['photo']) photoUrl = `/uploads/${req.files['photo'][0].filename}`;
            if (req.files['qualificationPdf']) qualificationPdf = `/uploads/${req.files['qualificationPdf'][0].filename}`;
        }

        const user = await prisma.user.create({
            data: {
                fullName,
                username,
                password: hashedPassword,
                role,
                email,
                phone,
                employeeId,
                nationalId,
                address,
                photoUrl,
                joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
                firstLogin: true
            }
        });

        if (role === 'TEACHER') {
            await prisma.teacherprofile.create({
                data: {
                    teacherId: user.id,
                    assignedClassroomId: classroomId ? parseInt(classroomId) : null,
                    qualification,
                    qualificationPdf,
                    designation: designation || 'ASSISTANT'
                }
            });
        }

        await logAction(req.user?.id || 1, `CREATE_STAFF: Created staff ${user.employeeId}`);

        res.status(201).json({
            message: 'Staff created successfully',
            credentials: { username, tempPassword },
            user
        });
    } catch (error) {
        next(error);
    }
};

exports.getStaffById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const staff = await prisma.user.findUnique({
            where: { id: parseInt(id) },
            include: {
                teacherprofile: {
                    include: { classroom: true }
                }
            }
        });
        if (!staff) return res.status(404).json({ message: 'Staff not found' });
        res.json(staff);
    } catch (error) {
        next(error);
    }
};

exports.updateStaff = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { qualification, assignedClassroomId, designation, ...userData } = req.body;

        // Handle uploaded files
        if (req.files) {
            if (req.files['photo']) userData.photoUrl = `/uploads/${req.files['photo'][0].filename}`;
        }

        const user = await prisma.user.update({
            where: { id: parseInt(id) },
            data: userData
        });

        if (user.role === 'TEACHER') {
            const profileData = {
                qualification,
                assignedClassroomId: assignedClassroomId ? parseInt(assignedClassroomId) : null,
                designation: designation || 'ASSISTANT'
            };

            if (req.files && req.files['qualificationPdf']) {
                profileData.qualificationPdf = `/uploads/${req.files['qualificationPdf'][0].filename}`;
            }

            await prisma.teacherprofile.upsert({
                where: { teacherId: user.id },
                update: profileData,
                create: {
                    teacherId: user.id,
                    ...profileData
                }
            });
        }

        await logAction(req.user.id, `UPDATE_STAFF: Updated staff ${user.employeeId}`);

        res.json(user);
    } catch (error) {
        next(error);
    }
};
