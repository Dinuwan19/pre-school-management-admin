const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');
const { sendTempPasswordEmail } = require('../services/mailer.service');
const { uploadFile } = require('../services/storage.service');
const { logAction } = require('../services/audit.service');
const dayjs = require('dayjs');

const NIC_REGEX = /^([0-9]{9}[vVxX]|(19|20)[0-9]{10})$/;
const EMAIL_REGEX = /^[^\s@]+@(gmail\.com|yahoo\.com|outlook\.com|icloud\.com)$/i;

exports.getAllStaff = async (req, res, next) => {
    try {
        const staff = await prisma.user.findMany({
            where: {
                role: { in: ['ADMIN', 'TEACHER', 'STAFF', 'CASHIER'] },
                status: 'ACTIVE'
            },
            include: {
                teacherprofile: {
                    include: {
                        classrooms: { select: { id: true, name: true } },
                        qualifications: true
                    }
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
        const { fullName, email, phone, role: inputRole, address, nationalId, joiningDate, classroomIds, qualification, designation, qualifications } = req.body;
        const role = inputRole || 'TEACHER';

        // 1. Mandatory Fields Validation
        if (!email || !nationalId || !address || !fullName) {
            return res.status(400).json({ message: 'Full Name, Email, NIC Number, and Address are mandatory for all staff.' });
        }

        // 2. NIC Format Validation
        const cleanNIC = nationalId.trim().toUpperCase();
        if (!NIC_REGEX.test(cleanNIC)) {
            return res.status(400).json({ message: 'Invalid NIC Format. Use 9 digits with V/X or 12 digits starting with 19/20.' });
        }

        // 3. Email Domain Validation
        if (!EMAIL_REGEX.test(email)) {
            return res.status(400).json({ message: 'Please use a valid email address from supported providers (Gmail, Yahoo, Outlook, iCloud).' });
        }

        // 4. Joining Date Validation
        if (joiningDate) {
            const jDate = dayjs(joiningDate);
            const now = dayjs();
            if (jDate.isAfter(now, 'day')) {
                return res.status(400).json({ message: 'Joining date cannot be in the future.' });
            }
            if (jDate.isBefore(now.subtract(1, 'month'), 'day')) {
                return res.status(400).json({ message: 'Joining date cannot be more than 1 month in the past.' });
            }
        }

        // 1. Pre-check for duplicate Email or Phone
        if (email || phone) {
            const existing = await prisma.user.findFirst({
                where: {
                    OR: [
                        email ? { email } : null,
                        phone ? { phone } : null
                    ].filter(Boolean)
                }
            });

            if (existing) {
                const field = existing.email === email ? 'Email' : 'Phone number';
                return res.status(400).json({ message: `${field} is already registered to another user.` });
            }
        }

        const prefix = role === 'TEACHER' ? 'T' : 'A';
        
        // Find the highest existing employeeId for this prefix
        const lastUser = await prisma.user.findFirst({
            where: { employeeId: { startsWith: prefix } },
            orderBy: { employeeId: 'desc' }
        });

        let nextNumber = 1;
        if (lastUser && lastUser.employeeId) {
            const lastNumber = parseInt(lastUser.employeeId.slice(1));
            if (!isNaN(lastNumber)) {
                nextNumber = lastNumber + 1;
            }
        }
        
        const employeeId = `${prefix}${nextNumber.toString().padStart(3, '0')}`;

        const cleanName = fullName.trim();
        const username = cleanName.toLowerCase().split(/\s+/).join('.') + Math.floor(Math.random() * 100);
        
        // Generate secure 10-character alphanumeric temporary password
        const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        const tempPassword = Array.from({ length: 10 }, () => charset[Math.floor(Math.random() * charset.length)]).join('');
        
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        // Handle uploaded files (Supabase)
        let photoUrl = req.body.photoUrl;
        let qualificationPdf = null;

        if (req.files && req.files['qualificationPdf']) {
            qualificationPdf = await uploadFile(req.files['qualificationPdf'][0], 'teacher-documents');
        }

        // 2. ATOMIC TRANSACTION: User + Profile
        const result = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
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
                    const ids = Array.isArray(classroomIds) ? classroomIds : [classroomIds];
                    validClassroomIds = ids.map(id => parseInt(id)).filter(id => !isNaN(id));

                    if (validClassroomIds.length > 3) {
                        throw new Error('A teacher can only be assigned to a maximum of 3 classrooms.');
                    }
                }

                let teacherQualifications = [];
                if (qualifications) {
                    try {
                        const parsed = typeof qualifications === 'string' ? JSON.parse(qualifications) : qualifications;
                        teacherQualifications = parsed.map(q => ({ title: q.title || q }));
                    } catch (e) {
                        teacherQualifications = [{ title: qualifications }];
                    }
                }

                await tx.teacherprofile.create({
                    data: {
                        teacherId: user.id,
                        qualification,
                        qualificationPdf,
                        designation: designation || 'ASSISTANT',
                        classrooms: {
                            connect: validClassroomIds.map(id => ({ id }))
                        },
                        qualifications: {
                            create: teacherQualifications
                        }
                    }
                });
            }

            return user;
        });

        const user = result;

        await logAction(req.user?.id || 1, `CREATE_STAFF: Created staff ${user.employeeId}`);

        // Send email credentials asynchronously (Non-blocking / Background)
        if (email) {
            sendTempPasswordEmail(email, username, tempPassword).catch(err => {
                console.warn('⚠️ Could not send email credential in background:', err.message);
            });
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
        if (error.code === 'P2002' && error.meta?.target?.includes('employeeId')) {
            return res.status(409).json({ message: 'A conflict occurred while generating Employee ID. Please try again.' });
        }
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
                    include: {
                        classrooms: true,
                        qualifications: true
                    }
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
        const { qualification, classroomIds, designation, qualifications, ...userData } = req.body;

        // RBAC: Only SUPER_ADMIN can edit staff profiles
        if (req.user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ message: 'Forbidden: Only Super Admin can edit staff' });
        }

        if (userData.joiningDate) {
            const jDate = dayjs(userData.joiningDate);
            const now = dayjs();
            if (jDate.isAfter(now, 'day')) {
                return res.status(400).json({ message: 'Joining date cannot be in the future.' });
            }
            if (jDate.isBefore(now.subtract(1, 'month'), 'day')) {
                return res.status(400).json({ message: 'Joining date cannot be more than 1 month in the past.' });
            }
            userData.joiningDate = jDate.toDate();
        }

        if (userData.nationalId) {
            const cleanNIC = userData.nationalId.trim().toUpperCase();
            if (!NIC_REGEX.test(cleanNIC)) {
                return res.status(400).json({ message: 'Invalid NIC Format. Use 9 digits with V/X or 12 digits starting with 19/20.' });
            }
            userData.nationalId = cleanNIC;
        }

        if (userData.email && !EMAIL_REGEX.test(userData.email)) {
            return res.status(400).json({ message: 'Please use a valid email address from supported providers (Gmail, Yahoo, Outlook, iCloud).' });
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

            // Handle Qualifications
            let qualificationUpdate = {};
            let qualificationCreate = {};
            if (qualifications) {
                try {
                    const parsed = typeof qualifications === 'string' ? JSON.parse(qualifications) : qualifications;
                    // Handle both array of strings and array of objects
                    const qData = parsed.map(q => {
                        const title = typeof q === 'string' ? q : (q.title || '');
                        return { title };
                    }).filter(q => q.title);

                    qualificationUpdate = {
                        qualifications: {
                            deleteMany: {},
                            create: qData
                        }
                    };
                    qualificationCreate = {
                        qualifications: {
                            create: qData
                        }
                    };
                } catch (e) {
                    console.error('Failed to parse qualifications', e);
                }
            }

            await prisma.teacherprofile.upsert({
                where: { teacherId: user.id },
                update: {
                    ...profileUpdateData,
                    ...classroomUpdateQuery,
                    ...qualificationUpdate
                },
                create: {
                    teacherId: user.id,
                    ...profileUpdateData,
                    ...classroomCreateQuery,
                    ...qualificationCreate
                }
            });
        }

        await logAction(req.user.id, `UPDATE_STAFF: Updated staff ${user.employeeId}`);

        res.json(user);
    } catch (error) {
        next(error);
    }
};
