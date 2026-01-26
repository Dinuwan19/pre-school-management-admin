const prisma = require('../config/prisma');
const { logAction } = require('../services/audit.service');
const dayjs = require('dayjs');
const { generateQRCode } = require('../utils/qrGenerator');

exports.createStudent = async (req, res, next) => {
    try {
        const {
            fullName, firstName, lastName, dob, gender, classroomId, parentId,
            medicalInfo, emergencyContact, enrollmentDate, secondParentId
        } = req.body;

        const count = await prisma.student.count();
        const studentUniqueId = `S${(count + 1).toString().padStart(4, '0')}`;
        const nameToUse = fullName || `${firstName} ${lastName}`;

        // Handle uploaded files
        let photoUrl = req.body.photoUrl;
        let birthCertPdf = null;

        if (req.files) {
            if (req.files['photo']) photoUrl = `/uploads/${req.files['photo'][0].filename}`;
            if (req.files['birthCert']) birthCertPdf = `/uploads/${req.files['birthCert'][0].filename}`;
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
                medicalInfo,
                emergencyContact,
                classroomId: parseInt(classroomId),
                parentId: parseInt(parentId),
                secondParentId: secondParentId ? parseInt(secondParentId) : null,
                qrCode: `TEMP_${Date.now()}`
            }
        });

        const qrPayload = JSON.stringify({ id: student.id, sid: student.studentUniqueId, name: student.fullName });
        const qrCodeImage = await generateQRCode(qrPayload);

        const updatedStudent = await prisma.student.update({
            where: { id: student.id },
            data: { qrCode: qrCodeImage }
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
        if (req.user.role === 'TEACHER') {
            const teacherProfile = await prisma.teacherprofile.findUnique({
                where: { teacherId: req.user.id }
            });
            if (teacherProfile && teacherProfile.assignedClassroomId) {
                where.classroomId = teacherProfile.assignedClassroomId;
            }
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

        if (req.user.role === 'TEACHER') {
            const teacherProfile = await prisma.teacherprofile.findUnique({
                where: { teacherId: req.user.id }
            });
            if (!teacherProfile || !teacherProfile.assignedClassroomId) {
                return res.status(403).json({ message: 'Forbidden: No classroom assigned' });
            }
            const studentCheck = await prisma.student.findFirst({
                where: { ...queryCondition, classroomId: teacherProfile.assignedClassroomId }
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
                        teacherprofile: {
                            where: { designation: 'LEAD' },
                            include: { user: { select: { fullName: true } } }
                        }
                    }
                },
                parent_student_parentIdToparent: true,
                parent_student_secondParentIdToparent: true,
                studentprogress: {
                    orderBy: { updatedAt: 'desc' },
                    take: 10,
                    include: { user: { select: { fullName: true } } }
                },
                attendance: attendanceQuery
            }
        });
        if (!student) return res.status(404).json({ message: 'Student not found' });

        // Calculate Summary for the requested month (or current month if none)
        // Note: use Prisma aggregate for efficiency in real app, but filter here is fine for now
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
        const totalDays = summaryAttendance.length;
        const attendancePercentage = totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 0;

        res.json({
            ...student,
            parent: student.parent_student_parentIdToparent,
            secondParent: student.parent_student_secondParentIdToparent,
            progress: student.studentprogress, // Now returns array
            attendanceHistory: student.attendance,
            attendanceSummary: {
                present: presentCount,
                total: totalDays,
                percentage: attendancePercentage
            }
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

        // Handle uploaded files
        if (req.files) {
            if (req.files['photo']) data.photoUrl = `/uploads/${req.files['photo'][0].filename}`;
            if (req.files['birthCert']) data.birthCertPdf = `/uploads/${req.files['birthCert'][0].filename}`;
        }

        const student = await prisma.student.update({
            where: { id: studentId },
            data: data
        });

        await logAction(req.user.id, `UPDATE_STUDENT: Updated student ${student.studentUniqueId}`);

        res.json({ message: 'Student updated successfully', student });
    } catch (error) {
        next(error);
    }
};

exports.updateStudentProgress = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reading, writing, speaking, listening, mathematics, social, remarks } = req.body;
        const student = await prisma.student.findUnique({ where: { id: parseInt(id) } });
        if (!student) return res.status(404).json({ message: 'Student not found' });

        if (req.user.role === 'TEACHER') {
            const teacherProfile = await prisma.teacherprofile.findUnique({
                where: { teacherId: req.user.id }
            });
            if (!teacherProfile || teacherProfile.assignedClassroomId !== student.classroomId) {
                return res.status(403).json({ message: 'Forbidden: Unauthorized classroom' });
            }
        }

        const progress = await prisma.studentprogress.create({
            data: {
                studentId: parseInt(id),
                reading: parseInt(reading) || 0,
                writing: parseInt(writing) || 0,
                speaking: parseInt(speaking) || 0,
                listening: parseInt(listening) || 0,
                mathematics: parseInt(mathematics) || 0,
                social: parseInt(social) || 0,
                remarks: remarks || '',
                updatedById: req.user.id
            }
        });
        res.json(progress);
    } catch (error) {
        next(error);
    }
};
