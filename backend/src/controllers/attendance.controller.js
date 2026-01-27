const prisma = require('../config/prisma');
const dayjs = require('dayjs');

exports.scanAttendance = async (req, res, next) => {
    try {
        console.log(`[Attendance] Scan attempt for studentId: ${req.body.studentId} by user: ${req.user?.username}`);
        const { studentId } = req.body;
        const markedById = req.user ? req.user.id : 1;
        const now = new Date();
        const todayStr = dayjs().format('YYYY-MM-DD');

        // 1. Validate Student
        if (!studentId || isNaN(parseInt(studentId))) {
            return res.status(400).json({
                message: 'Invalid or missing student ID in QR code',
                status: 'ERROR'
            });
        }

        const student = await prisma.student.findUnique({ where: { id: parseInt(studentId) } });
        if (!student || student.status !== 'ACTIVE') {
            return res.status(404).json({ message: 'Student not found or inactive', status: 'ERROR' });
        }

        // Scoping check for Teacher/Staff
        if (req.classroomScope && student.classroomId !== req.classroomScope) {
            return res.status(403).json({ message: 'Forbidden: Student is not in your assigned classroom', status: 'ERROR' });
        }

        // 2. Find existing record for today
        const attendance = await prisma.attendance.findFirst({
            where: {
                studentId: parseInt(studentId),
                attendanceDate: new Date(todayStr)
            }
        });

        // 3. Logic: 2-Hour Gap Rule
        let result = {};

        if (!attendance) {
            // CASE A: No record -> First Check-in
            const newRecord = await prisma.attendance.create({
                data: {
                    studentId: student.id,
                    attendanceDate: new Date(todayStr),
                    checkInTime: now,
                    markedById,
                    method: 'QR',
                    status: 'PRESENT',
                    deviceId: req.body.deviceId || 'UNKNOWN'
                }
            });
            result = { message: 'Checked In Successfully', type: 'CHECK_IN', data: newRecord };
        } else {
            // CASE B: Already has record
            const lastUpdate = attendance.checkOutTime || attendance.checkInTime;
            const diffMinutes = dayjs(now).diff(dayjs(lastUpdate), 'minute');

            if (diffMinutes < 2) {
                // Debounce: Double scan within 2 minutes -> Ignore
                return res.json({
                    message: 'Already scanned just now',
                    type: 'IGNORED',
                    data: attendance,
                    student: {
                        fullName: student.fullName,
                        photoUrl: student.photoUrl,
                        id: student.studentUniqueId
                    }
                });
            }

            if (!attendance.checkOutTime) {
                // Has Check-in, No Check-out
                if (diffMinutes >= 120) { // 2 Hours (120 mins)
                    // Check-out
                    const updated = await prisma.attendance.update({
                        where: { id: attendance.id },
                        data: {
                            checkOutTime: now,
                            status: 'COMPLETED'
                        }
                    });
                    result = { message: 'Checked Out Successfully', type: 'CHECK_OUT', data: updated };
                } else {
                    // Less than 2 hours -> Warning/Info
                    return res.json({
                        message: 'Already checked in. Try again later for check-out.',
                        type: 'ALREADY_IN',
                        data: attendance,
                        student: {
                            fullName: student.fullName,
                            photoUrl: student.photoUrl,
                            id: student.studentUniqueId
                        }
                    });
                }
            } else {
                // Already checked out
                return res.json({
                    message: 'Attendance already completed for today',
                    type: 'COMPLETED',
                    data: attendance,
                    student: {
                        fullName: student.fullName,
                        photoUrl: student.photoUrl,
                        id: student.studentUniqueId
                    }
                });
            }
        }

        // 4. Return enriched data for visual verification
        res.json({
            ...result,
            student: {
                fullName: student.fullName,
                photoUrl: student.photoUrl,
                id: student.studentUniqueId
            }
        });

    } catch (error) {
        next(error);
    }
};

exports.manualAttendance = async (req, res, next) => {
    try {
        const { studentId, status, date, checkInTime, checkOutTime } = req.body;
        const markedById = req.user.id;
        const attendanceDate = date ? new Date(date) : new Date();
        const auditReason = req.body.reason || 'Manual Override';

        // Scoping check
        if (req.classroomScope) {
            const student = await prisma.student.findUnique({ where: { id: parseInt(studentId) } });
            if (!student || student.classroomId !== req.classroomScope) {
                return res.status(403).json({ message: 'Forbidden: Student not in your classroom' });
            }
        }

        // 1. Audit: Get old data if exists
        const existing = await prisma.attendance.findFirst({
            where: {
                studentId: parseInt(studentId),
                attendanceDate: attendanceDate
            }
        });

        let attendance;

        const updateData = {
            status,
            method: 'MANUAL',
            markedById,
            checkInTime: checkInTime ? new Date(checkInTime) : undefined,
            checkOutTime: checkOutTime ? new Date(checkOutTime) : undefined
        };

        if (existing) {
            // Update
            attendance = await prisma.attendance.update({
                where: { id: existing.id },
                data: updateData
            });
            // Create Audit Log
            await prisma.attendanceaudit.create({
                data: {
                    attendanceId: attendance.id,
                    changedById: markedById,
                    oldData: JSON.stringify(existing),
                    newData: JSON.stringify(attendance),
                    reason: auditReason
                }
            });
        } else {
            // Create
            attendance = await prisma.attendance.create({
                data: {
                    studentId: parseInt(studentId),
                    attendanceDate,
                    ...updateData
                }
            });
        }

        res.json({ message: 'Manual attendance updated', attendance });
    } catch (error) {
        next(error);
    }
};

exports.bulkMarkAttendance = async (req, res, next) => {
    try {
        // Use classroom scoping from middleware if exists
        let finalClassroomId = parseInt(classroomId);
        if (req.classroomScope) {
            finalClassroomId = req.classroomScope;
        } else if (req.user.role === 'TEACHER' || req.user.role === 'STAFF') {
            return res.status(403).json({ message: 'Access denied: No classroom assigned' });
        }

        // 1. Get all students in classroom
        const students = await prisma.student.findMany({
            where: {
                classroomId: finalClassroomId,
                status: 'ACTIVE'
            },
            select: { id: true }
        });

        const studentIds = students.map(s => s.id);

        // 2. Find existing records to avoid duplicates in createMany
        const existingRecords = await prisma.attendance.findMany({
            where: {
                studentId: { in: studentIds },
                attendanceDate: attendanceDate
            },
            select: { studentId: true }
        });

        const existingSet = new Set(existingRecords.map(r => r.studentId));
        const newStudentIds = studentIds.filter(id => !existingSet.has(id));

        // 3. Update existing ones if they aren't 'COMPLETED' (or as per rule)
        if (existingRecords.length > 0) {
            await prisma.attendance.updateMany({
                where: {
                    attendanceDate: attendanceDate,
                    studentId: { in: Array.from(existingSet) },
                    status: { not: 'COMPLETED' }
                },
                data: {
                    status,
                    method: 'MANUAL',
                    markedById
                }
            });
        }

        // 4. Create new ones
        if (newStudentIds.length > 0) {
            await prisma.attendance.createMany({
                data: newStudentIds.map(id => ({
                    studentId: id,
                    attendanceDate: attendanceDate,
                    status,
                    method: 'MANUAL',
                    markedById,
                    checkInTime: status === 'PRESENT' ? new Date() : null
                }))
            });
        }

        res.json({ message: `Bulk marked ${studentIds.length} students as ${status}` });
    } catch (error) {
        next(error);
    }
};

exports.getDailyAttendance = async (req, res, next) => {
    try {
        const date = req.query.date || dayjs().format('YYYY-MM-DD');
        const searchDate = new Date(date);

        // 1. Get Students (Scoped by role)
        let studentWhere = { status: 'ACTIVE' };
        if (req.classroomScope) {
            studentWhere.classroomId = req.classroomScope;
        } else if (req.user.role === 'TEACHER' || req.user.role === 'STAFF') {
            return res.json([]);
        }

        const students = await prisma.student.findMany({
            where: studentWhere,
            include: {
                classroom: { select: { name: true } },
                attendance: {
                    where: { attendanceDate: searchDate }
                }
            }
        });

        // 2. Flatten result: One student with its attendance (if exists)
        const result = students.map(s => {
            const att = s.attendance.length > 0 ? s.attendance[0] : null;
            return {
                id: att ? att.id : `ST-${s.id}`, // temp ID if not in DB
                studentId: s.id,
                checkInTime: att ? att.checkInTime : null,
                checkOutTime: att ? att.checkOutTime : null,
                status: att ? att.status : 'NOT_MARKED',
                method: att ? att.method : null,
                student: {
                    id: s.id,
                    fullName: s.fullName,
                    studentUniqueId: s.studentUniqueId,
                    photoUrl: s.photoUrl,
                    classroom: s.classroom
                }
            };
        });

        res.json(result);
    } catch (error) {
        next(error);
    }
};

exports.getStudentAttendanceSummary = async (req, res, next) => {
    try {
        const { studentId } = req.params;
        const studentIdInt = parseInt(studentId);

        // Data Scoping
        if (req.user.role === 'PARENT') {
            const student = await prisma.student.findUnique({
                where: { id: studentIdInt }
            });
            const parentProfile = await prisma.parent.findUnique({ where: { userId: req.user.id } });

            if (!student || !parentProfile || (student.parentId !== parentProfile.id && student.secondParentId !== parentProfile.id)) {
                return res.status(403).json({ message: 'Forbidden' });
            }
        }

        const attendance = await prisma.attendance.findMany({
            where: { studentId: studentIdInt },
            orderBy: { attendanceDate: 'desc' },
            take: 30
        });

        const totalDays = attendance.length;
        const presentDays = attendance.filter(a => a.checkInTime).length;

        // Better attendance rate: present days / (days since enrollment or 30, whichever is smaller)
        // For simplicity now, let's assume totalDays is the baseline if data is available, 
        // but if data is sparse, let's look at the date range.
        let attendanceRate = 0;
        if (totalDays > 0) {
            const earliest = dayjs(attendance[totalDays - 1].attendanceDate);
            const latest = dayjs(attendance[0].attendanceDate);
            const rangeDays = latest.diff(earliest, 'days') + 1;
            // Count week days in range
            let workingDays = 0;
            for (let i = 0; i < rangeDays; i++) {
                const d = earliest.add(i, 'day');
                if (d.day() !== 0 && d.day() !== 6) workingDays++;
            }
            attendanceRate = workingDays > 0 ? Math.round((presentDays / workingDays) * 100) : 100;
        }
        if (attendanceRate > 100) attendanceRate = 100;

        res.json({
            studentId: studentIdInt,
            totalDays,
            presentDays,
            attendanceRate,
            history: attendance
        });
    } catch (error) {
        next(error);
    }
};
