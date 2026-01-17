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
            const parentProfile = await prisma.parent.findFirst({
                where: { email: req.user.username }
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
        }

        const student = await prisma.student.findFirst({
            where: queryCondition,
            include: {
                classroom: true,
                parent_student_parentIdToparent: true,
                parent_student_secondParentIdToparent: true,
                studentprogress: { orderBy: { updatedAt: 'desc' }, take: 1 }
            }
        });
        if (!student) return res.status(404).json({ message: 'Student not found' });

        res.json({
            ...student,
            parent: student.parent_student_parentIdToparent,
            secondParent: student.parent_student_secondParentIdToparent,
            progress: student.studentprogress
        });
    } catch (error) {
        next(error);
    }
};

exports.updateStudent = async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = { ...req.body };

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
            where: { id: parseInt(id) },
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
