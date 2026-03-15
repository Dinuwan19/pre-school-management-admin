const prisma = require('../config/prisma');
const { logAction } = require('../services/audit.service');
const dayjs = require('dayjs');
const { generateQRCode } = require('../utils/qrGenerator');
const { uploadFile, uploadLocalFile } = require('../services/storage.service'); // Import service

exports.createStudent = async (req, res, next) => {
    try {
        // Teachers and Staff cannot add students
        if (req.user.role === 'TEACHER' || req.user.role === 'STAFF') {
            return res.status(403).json({ message: 'Access denied: Teachers and Staff cannot create students.' });
        }

        const {
            fullName, firstName, lastName, dob, gender, classroomId, parentId,
            medicalInfo, emergencyContact, enrollmentDate, secondParentId
        } = req.body;

        const count = await prisma.student.count();
        const studentUniqueId = `S${(count + 1).toString().padStart(4, '0')}`;
        const nameToUse = fullName || `${firstName} ${lastName}`;

        // Handle uploaded files (Supabase)
        let photoUrl = req.body.photoUrl;
        let birthCertPdf = null;
        let vaccineCardPdf = null;

        if (req.files) {
            if (req.files['photo']) {
                photoUrl = await uploadFile(req.files['photo'][0], 'student photos');
            }
            if (req.files['birthCert']) {
                birthCertPdf = await uploadFile(req.files['birthCert'][0], 'student-documents');
            }
            if (req.files['vaccineCard']) {
                vaccineCardPdf = await uploadFile(req.files['vaccineCard'][0], 'student-documents');
            }
        }

        const student = await prisma.student.create({
            data: {
                fullName: nameToUse,
                studentUniqueId,
                dateOfBirth: dob ? new Date(dob) : null,
                enrollmentDate: enrollmentDate ? new Date(enrollmentDate) : new Date(),
                gender,
                photoUrl,
                birthCertPdf,
                vaccineCardPdf,
                medicalInfo,
                emergencyContact,
                classroomId: parseInt(classroomId),
                parentId: parseInt(parentId),
                secondParentId: secondParentId ? parseInt(secondParentId) : null,
                qrCode: `TEMP_${Date.now()}`
            }
        });

        const qrPayload = JSON.stringify({ id: student.id, sid: student.studentUniqueId, name: student.fullName });
        const { generateQRCodeBuffer } = require('../utils/qrGenerator');
        const qrBuffer = await generateQRCodeBuffer(qrPayload);

        let qrCodeUrl = null;
        if (qrBuffer) {
            const qrFilename = `qr-${student.studentUniqueId}-${Date.now()}.png`;
            qrCodeUrl = await uploadLocalFile(qrFilename, qrBuffer, 'image/png', 'student-documents');
        }

        const updatedStudent = await prisma.student.update({
            where: { id: student.id },
            data: { qrCode: qrCodeUrl }
        });

        await logAction(req.user?.id || 1, `CREATE_STUDENT: Created student ${student.studentUniqueId}`);

        res.status(201).json(updatedStudent);
    } catch (error) {
        next(error);
    }
};

exports.getAllStudents = async (req, res, next) => {
    try {
        let where = { status: 'ACTIVE' };

        // Use classroom scoping from middleware
        // Use classroom scoping from middleware
        if (req.classroomScope) {
            // If scope is empty array, it means no access (handled by middleware usually but safe to check)
            if (req.classroomScope.length === 0) return res.json([]);
            where.classroomId = { in: req.classroomScope };
        } else if (req.user.role === 'TEACHER' || req.user.role === 'STAFF') {
            // Teacher with no classroom assigned sees nothing
            return res.json([]);
        } else if (req.user.role === 'PARENT') {
            const parentProfile = await prisma.parent.findUnique({
                where: { userId: req.user.id }
            });
            if (parentProfile) {
                where.OR = [
                    { parentId: parentProfile.id },
                    { secondParentId: parentProfile.id }
                ];
            } else {
                return res.json([]);
            }
        }

        const students = await prisma.student.findMany({
            where,
            include: {
                classroom: { select: { name: true } },
                parent_student_parentIdToparent: { select: { fullName: true } }
            },
            orderBy: { fullName: 'asc' }
        });

        const formattedStudents = students.map(s => ({
            ...s,
            parent: s.parent_student_parentIdToparent
        }));
        res.json(formattedStudents);
    } catch (error) {
        next(error);
    }
};

exports.getStudentById = async (req, res, next) => {
    try {
        const { id } = req.params;
        let queryCondition = {
            OR: [
                { id: isNaN(parseInt(id)) ? undefined : parseInt(id) },
                { studentUniqueId: id }
            ]
        };

        if (req.classroomScope) {
            if (req.classroomScope.length === 0) return res.status(403).json({ message: 'Forbidden: No classrooms assigned' });

            const studentCheck = await prisma.student.findFirst({
                where: { ...queryCondition, classroomId: { in: req.classroomScope } }
            });
            if (!studentCheck) return res.status(403).json({ message: 'Forbidden: Student not in your classroom' });
        } else if (req.user.role === 'PARENT') {
            const parentProfile = await prisma.parent.findUnique({
                where: { userId: req.user.id }
            });
            if (!parentProfile) return res.status(403).json({ message: 'Forbidden: Parent profile not found' });

            const studentCheck = await prisma.student.findFirst({
                where: { ...queryCondition, OR: [{ parentId: parentProfile.id }, { secondParentId: parentProfile.id }] }
            });
            if (!studentCheck) return res.status(403).json({ message: 'Forbidden: This is not your child' });
        }

        // Determine date range for attendance
        const { month } = req.query; // Expect 'YYYY-MM'
        let dateFilter = {};
        let summaryStart;
        let summaryEnd;

        if (month) {
            const startStr = `${month}-01`;
            summaryStart = dayjs(startStr).startOf('month').toDate();
            summaryEnd = dayjs(startStr).endOf('month').toDate();
        } else {
            summaryStart = dayjs().startOf('month').toDate();
            // Default: show last 60 days history if no month selected, but summary is current month
            // Actually, matching user request: "History: Show last 10 days" initially.
            // But let's allow fetching full month if requested.
        }

        // We'll return 2 sets: 'history' (limited or specific month) and 'summary' (stats)
        // If month is specific: return ALL records for that month.
        // If no month: return last 30 records.

        let attendanceQuery = { orderBy: { attendanceDate: 'desc' } };
        if (month) {
            attendanceQuery.where = {
                attendanceDate: {
                    gte: summaryStart,
                    lte: summaryEnd
                }
            };
        } else {
            attendanceQuery.take = 30;
        }

        const student = await prisma.student.findFirst({
            where: queryCondition,
            include: {
                classroom: {
                    include: {
                        teacherprofiles: {
                            where: { designation: 'LEAD' },
                            include: { user: { select: { id: true, fullName: true, role: true } } }
                        }
                    }
                },
                parent_student_parentIdToparent: true,
                parent_student_secondParentIdToparent: true,
                parent_student_parentIdToparent: true,
                parent_student_secondParentIdToparent: true,
                assessments: {
                    orderBy: { updatedAt: 'desc' },
                    take: 10,
                    include: {
                        user: { select: { fullName: true } },
                        scores: { include: { subSkill: { include: { category: true } } } }
                    }
                },
                attendance: attendanceQuery
            }
        });
        if (!student) return res.status(404).json({ message: 'Student not found' });

        // ... existing staff logic ...
        // Fetch all teachers in this classroom
        const classroomTeachers = await prisma.teacherprofile.findMany({
            where: { classrooms: { some: { id: student.classroomId } } },
            include: { user: { select: { id: true, fullName: true, role: true } } }
        });

        // Fetch Super Admins
        const superAdmins = await prisma.user.findMany({
            where: { role: 'SUPER_ADMIN', status: 'ACTIVE' },
            select: { id: true, fullName: true, role: true }
        });

        const availableStaff = [
            ...classroomTeachers.map(t => ({ id: t.user.id, name: t.user.fullName, role: t.user.role, isLead: t.designation === 'LEAD' })),
            ...superAdmins.map(a => ({ id: a.id, name: a.fullName, role: 'ADMIN', isLead: false }))
        ];

        // Calculate Summary for the requested month (or current month if none)
        const summaryContextDate = month ? dayjs(`${month}-01`) : dayjs();
        const summaryAttendance = await prisma.attendance.findMany({
            where: {
                studentId: student.id,
                attendanceDate: {
                    gte: summaryContextDate.startOf('month').toDate(),
                    lte: summaryContextDate.endOf('month').toDate()
                }
            }
        });

        const presentCount = summaryAttendance.filter(a => ['PRESENT', 'LATE', 'COMPLETED'].includes(a.status)).length;
        let workingDays = 0;
        if (summaryAttendance.length > 0) {
            const earliest = dayjs(summaryAttendance[summaryAttendance.length - 1].attendanceDate);
            const latest = dayjs(summaryAttendance[0].attendanceDate);
            const rangeDays = latest.diff(earliest, 'days') + 1;
            for (let i = 0; i < rangeDays; i++) {
                const d = earliest.add(i, 'day');
                if (d.day() !== 0 && d.day() !== 6) workingDays++;
            }
        }
        const attendancePercentage = workingDays > 0 ? Math.round((presentCount / workingDays) * 100) : 100;

        // Transcode assessments and calculate overall percentage
        const legacyProgress = {};
        const latestAssessment = student.assessments?.[0];
        let overallProgress = 0;
        if (latestAssessment && latestAssessment.scores && latestAssessment.scores.length > 0) {
            const totalScore = latestAssessment.scores.reduce((acc, s) => acc + s.score, 0);
            overallProgress = Math.round((totalScore / (latestAssessment.scores.length * 3)) * 100);

            latestAssessment.scores.forEach(s => {
                const name = s.subSkill?.name?.toLowerCase() || '';
                if (name.includes('reading')) legacyProgress.reading = s.score;
                if (name.includes('writing')) legacyProgress.writing = s.score;
                if (name.includes('speaking')) legacyProgress.speaking = s.score;
                if (name.includes('listening')) legacyProgress.listening = s.score;
                if (name.includes('math')) legacyProgress.mathematics = s.score;
                if (name.includes('social')) legacyProgress.social = s.score;
            });
            legacyProgress.remarks = latestAssessment.remarks;
            legacyProgress.updatedAt = latestAssessment.updatedAt;
            legacyProgress.user = latestAssessment.user;
        }

        res.json({
            ...student,
            parent: student.parent_student_parentIdToparent,
            secondParent: student.parent_student_secondParentIdToparent,
            progress: { ...legacyProgress, overall: overallProgress }, // Added overall
            overallProgress,
            assessments: student.assessments,
            attendanceHistory: student.attendance,
            attendanceSummary: {
                presentDays: presentCount,
                totalDays: workingDays || summaryAttendance?.length || 0, // Fix: use summaryAttendance instead of undefined weekdayAttendance
                attendanceRate: attendancePercentage
            },
            availableStaff
        });
    } catch (error) {
        next(error);
    }
};

exports.updateStudent = async (req, res, next) => {
    try {
        const { id } = req.params;
        const studentId = parseInt(id);
        const data = { ...req.body };

        // 1. Authorization check
        const existingStudent = await prisma.student.findUnique({
            where: { id: studentId }
        });

        if (!existingStudent) return res.status(404).json({ message: 'Student not found' });

        if (req.user.role === 'PARENT') {
            const parent = await prisma.parent.findUnique({ where: { userId: req.user.id } });
            if (!parent || (existingStudent.parentId !== parent.id && existingStudent.secondParentId !== parent.id)) {
                return res.status(403).json({ message: 'Forbidden: This is not your child' });
            }
            // Limit what parents can update
            const allowedFields = ['fullName', 'emergencyContact', 'medicalInfo', 'photoUrl', 'dob', 'dateOfBirth', 'gender'];
            Object.keys(data).forEach(key => {
                if (!allowedFields.includes(key)) delete data[key];
            });
        }

        // 2. Data processing
        delete data.id;
        delete data.studentUniqueId;

        if (data.dob) data.dateOfBirth = new Date(data.dob);
        if (data.enrollmentDate) data.enrollmentDate = new Date(data.enrollmentDate);
        if (data.classroomId) data.classroomId = parseInt(data.classroomId);
        if (data.parentId) data.parentId = parseInt(data.parentId);
        if (data.secondParentId) data.secondParentId = parseInt(data.secondParentId);
        delete data.dob;

        // Handle uploaded files (Supabase)
        if (req.files) {
            if (req.files['photo']) {
                data.photoUrl = await uploadFile(req.files['photo'][0], 'student photos');
            }
            if (req.files['birthCert']) {
                data.birthCertPdf = await uploadFile(req.files['birthCert'][0], 'student-documents');
            }
            if (req.files['vaccineCard']) {
                data.vaccineCardPdf = await uploadFile(req.files['vaccineCard'][0], 'student-documents');
            }
        }

        console.log('Update Data before cleaning:', data);
        console.log('Received Files:', Object.keys(req.files || {}));

        // 3. Final cleanup - ensure only valid schema fields are passed to Prisma
        const validFields = [
            'fullName', 'enrollmentDate', 'dateOfBirth', 'gender',
            'medicalInfo', 'emergencyContact', 'photoUrl', 'avatarType',
            'birthCertPdf', 'vaccineCardPdf', 'parentId', 'secondParentId',
            'classroomId', 'status'
        ];

        const prismaData = {};
        validFields.forEach(field => {
            if (data[field] !== undefined && data[field] !== 'undefined' && data[field] !== null) {
                prismaData[field] = data[field];
            }
        });

        console.log('Prisma Update Data:', prismaData);

        const student = await prisma.student.update({
            where: { id: studentId },
            data: prismaData
        });

        await logAction(req.user.id, `UPDATE_STUDENT: Updated student ${student.studentUniqueId}`);

        res.json({ message: 'Student updated successfully', student });
    } catch (error) {
        next(error);
    }
};

exports.getSkillMetadata = async (req, res, next) => {
    try {
        const categories = await prisma.skill_category.findMany({
            include: { skills: true },
            orderBy: { id: 'asc' }
        });
        res.json(categories);
    } catch (error) {
        next(error);
    }
};

exports.updateStudentProgress = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { term, remarks, scores } = req.body; // scores: [{ subSkillId, score }]

        const student = await prisma.student.findUnique({ where: { id: parseInt(id) } });
        if (!student) return res.status(404).json({ message: 'Student not found' });

        if (req.user.role === 'TEACHER') {
            const teacherProfile = await prisma.teacherprofile.findUnique({
                where: { teacherId: req.user.id },
                include: { classrooms: true }
            });
            const isAssigned = teacherProfile?.classrooms.some(c => c.id === student.classroomId);
            if (!isAssigned) return res.status(403).json({ message: 'Forbidden: Unauthorized' });
        }

        // 1. Check for existing assessment for this term
        const existingAssessment = await prisma.assessment.findFirst({
            where: {
                studentId: parseInt(id),
                term: parseInt(term) || 1
            }
        });

        let assessment;
        if (existingAssessment) {
            // Update existing
            assessment = await prisma.assessment.update({
                where: { id: existingAssessment.id },
                data: {
                    remarks: remarks || '',
                    updatedById: req.user.id,
                    scores: {
                        deleteMany: {}, // Clear old scores
                        create: (scores || []).map(s => ({
                            subSkillId: s.subSkillId,
                            score: s.score
                        }))
                    }
                },
                include: { scores: true }
            });
        } else {
            // Create new
            assessment = await prisma.assessment.create({
                data: {
                    studentId: parseInt(id),
                    term: parseInt(term) || 1,
                    remarks: remarks || '',
                    updatedById: req.user.id,
                    scores: {
                        create: (scores || []).map(s => ({
                            subSkillId: s.subSkillId,
                            score: s.score
                        }))
                    }
                },
                include: { scores: true }
            });
        }

        await logAction(req.user.id, `${existingAssessment ? 'UPDATE' : 'CREATE'}_PROGRESS: Assessment for student ${student.studentUniqueId} (Term ${term})`);

        res.json(assessment);
    } catch (error) {
        next(error);
    }
};

exports.createSubSkill = async (req, res, next) => {
    try {
        const { categoryId } = req.params;
        const { name } = req.body;

        if (!name) return res.status(400).json({ message: 'Sub-skill name is required' });

        const subSkill = await prisma.sub_skill.create({
            data: {
                categoryId: parseInt(categoryId),
                name
            }
        });

        await logAction(req.user.id, `CREATE_SUBSKILL: Added ${name} to category ${categoryId}`);
        res.status(201).json(subSkill);
    } catch (error) {
        next(error);
    }
};

module.exports = exports;
