const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');
const { sendAccountCredentials } = require('../services/email.service');
const { uploadFile } = require('../services/storage.service');
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
                    include: { classrooms: { select: { name: true } } }
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
        const { fullName, email, phone, role, address, nationalId, joiningDate, classroomIds, qualification, designation } = req.body;

        const prefix = role === 'TEACHER' ? 'T' : 'A';
        const count = await prisma.user.count({ where: { role: role } });
        const employeeId = `${prefix}${(count + 1).toString().padStart(3, '0')}`;

        const cleanName = fullName.trim();
        const username = cleanName.toLowerCase().split(/\s+/).join('.') + Math.floor(Math.random() * 100);
        const tempPassword = cleanName.split(/\s+/)[0].toLowerCase() + '@123';
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        // Handle uploaded files (Supabase)
        let photoUrl = req.body.photoUrl;
        let qualificationPdf = null;

        if (req.files && req.files['qualificationPdf']) {
            qualificationPdf = await uploadFile(req.files['qualificationPdf'][0], 'teacher-documents');
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
            // Validate classroom limit
            let validClassroomIds = [];
            if (classroomIds) {
                // Determine if array or single ID coming from form
                const ids = Array.isArray(classroomIds) ? classroomIds : [classroomIds];
                validClassroomIds = ids.map(id => parseInt(id)).filter(id => !isNaN(id));

                if (validClassroomIds.length > 3) {
                    throw new Error('A teacher can only be assigned to a maximum of 3 classrooms.');
                }
            }

            await prisma.teacherprofile.create({
                data: {
                    teacherId: user.id,
                    qualification,
                    qualificationPdf,
                    designation: designation || 'ASSISTANT',
                    classrooms: {
                        connect: validClassroomIds.map(id => ({ id }))
                    }
                }
            });
        }

        await logAction(req.user?.id || 1, `CREATE_STAFF: Created staff ${user.employeeId}`);

        // Send email credentials
        if (email) {
            await sendAccountCredentials(email, username, tempPassword);
        }

        res.status(201).json({
            message: 'Staff created successfully. Instructions sent to email.',
            user,
            credentials: {
                username,
                tempPassword
            }
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
                    include: { classrooms: true }
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
        const { qualification, classroomIds, designation, ...userData } = req.body;

        // RBAC: Only SUPER_ADMIN can edit staff profiles
        if (req.user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ message: 'Forbidden: Only Super Admin can edit staff' });
        }

        if (userData.joiningDate) {
            userData.joiningDate = new Date(userData.joiningDate);
        }

        // Handle uploaded files (Supabase) - Photo removed for staff


        // Final cleanup - ensure only valid schema fields are passed to Prisma
        const validUserFields = [
            'fullName', 'username', 'email', 'phone', 'role',
            'nationalId', 'address', 'photoUrl', 'joiningDate', 'status'
        ];

        const prismaUserData = {};
        validUserFields.forEach(field => {
            if (userData[field] !== undefined && userData[field] !== 'undefined' && userData[field] !== null) {
                prismaUserData[field] = userData[field];
            }
        });

        const user = await prisma.user.update({
            where: { id: parseInt(id) },
            data: prismaUserData
        });

        if (user.role === 'TEACHER') {
            const profileUpdateData = {
                qualification,
                designation: designation || 'ASSISTANT'
            };

            if (req.files && req.files['qualificationPdf']) {
                profileUpdateData.qualificationPdf = await uploadFile(req.files['qualificationPdf'][0], 'teacher-documents');
            }

            // Handle Classrooms
            let classroomUpdateQuery = {};
            let classroomCreateQuery = {};

            if (classroomIds) {
                // Determine if array or single ID coming from form (multer treats single values as strings)
                let ids = classroomIds;
                if (typeof classroomIds === 'string' && classroomIds.includes('[')) {
                    try {
                        ids = JSON.parse(classroomIds);
                    } catch (e) {
                        ids = classroomIds.split(',').map(i => i.trim());
                    }
                } else if (typeof classroomIds === 'string') {
                    ids = [classroomIds];
                }

                const validIds = ids.map(id => parseInt(id)).filter(id => !isNaN(id));

                if (validIds.length > 3) {
                    return res.status(400).json({ message: 'Max 3 classrooms allowed per teacher.' });
                }

                classroomUpdateQuery = {
                    classrooms: {
                        set: validIds.map(id => ({ id })) // Replace existing connections
                    }
                };

                classroomCreateQuery = {
                    classrooms: {
                        connect: validIds.map(id => ({ id }))
                    }
                };
            }

            await prisma.teacherprofile.upsert({
                where: { teacherId: user.id },
                update: {
                    ...profileUpdateData,
                    ...classroomUpdateQuery
                },
                create: {
                    teacherId: user.id,
                    ...profileUpdateData,
                    ...classroomCreateQuery
                }
            });
        }

        await logAction(req.user.id, `UPDATE_STAFF: Updated staff ${user.employeeId}`);

        res.json(user);
    } catch (error) {
        next(error);
    }
};
