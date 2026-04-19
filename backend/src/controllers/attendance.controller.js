const prisma = require('../config/prisma');
const dayjs = require('dayjs');

exports.scanAttendance = async (req, res, next) => {
    try {
        console.log(`[Attendance] Scan attempt for studentId: ${req.body.studentId} by user: ${req.user?.username}`);
        const { studentId, forceMode } = req.body;
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
        if (req.classroomScope && !req.classroomScope.includes(student.classroomId)) {
            console.log(`[Attendance] 403 REJECT: Student ${studentId} is in classroom ${student.classroomId}, but teacher ${req.user.username} is scoped to [${req.classroomScope}]`);
            return res.status(403).json({
                message: `Forbidden: This student belongs to ${student.classroom?.name || 'another classroom'}. Your assigned classrooms are: ${req.classroomScope.join(', ') || 'None'}`,
                status: 'ERROR'
            });
        }

        // 2. Find existing record for today
        const attendance = await prisma.attendance.findFirst({
            where: {
                studentId: parseInt(studentId),
                attendanceDate: new Date(todayStr)
            }
        });

        // 3. Logic: 2-Hour Gap Rule + Late Marking + Force Mode
        let result = {};
        const schoolStartTime = dayjs(todayStr).hour(8).minute(0); // 8:00 AM
        const lateThreshold = schoolStartTime.add(30, 'minute'); // 8:30 AM

        // Determine if we should perform Check-In or Check-Out
        let mode = 'AUTO';
        if (forceMode === 'CHECK_IN') mode = 'IN';
        else if (forceMode === 'CHECK_OUT') mode = 'OUT';
        else {
            // If no record OR existing record is ABSENT, we should Check-In
            if (!attendance || attendance.status === 'ABSENT') mode = 'IN';
            else mode = 'OUT';
        }

        if (mode === 'IN') {
            // Case 1: No record yet -> Create new
            if (!attendance) {
                const isLate = dayjs(now).isAfter(lateThreshold);
                const newRecord = await prisma.attendance.create({
                    data: {
                        studentId: student.id,
                        attendanceDate: new Date(todayStr),
                        checkInTime: now,
                        markedById,
                        method: 'QR',
                        status: isLate ? 'LATE' : 'PRESENT',
                        deviceId: req.body.deviceId || 'UNKNOWN'
                    }
                });
                result = { message: isLate ? 'Checked In (LATE)' : 'Checked In Successfully', type: 'CHECK_IN', data: newRecord };
            }
            // Case 2: Record exists but is ABSENT -> Update the existing record instead of createMany/create unique conflict
            else if (attendance.status === 'ABSENT') {
                const isLate = dayjs(now).isAfter(lateThreshold);
                const updatedRecord = await prisma.attendance.update({
                    where: { id: attendance.id },
                    data: {
                        checkInTime: now,
                        status: isLate ? 'LATE' : 'PRESENT',
                        method: 'QR',
                        markedById,
                        deviceId: req.body.deviceId || 'UNKNOWN'
                    }
                });
                result = { message: isLate ? 'Checked In (LATE - was ABSENT)' : 'Checked In Successfully', type: 'CHECK_IN', data: updatedRecord };
            }
            else {
                return res.json({
                    message: 'Already checked in for today',
                    type: 'ALREADY_IN',
                    data: attendance,
                    student: { fullName: student.fullName, photoUrl: student.photoUrl, id: student.studentUniqueId }
                });
            }
        } else {
            // mode === 'OUT'

            // Fix Bug 1: Cannot Check-Out if no Check-In record exists (or is ABSENT)
            if (!attendance || !attendance.checkInTime) {
                return res.status(400).json({
                    message: 'Cannot Check-Out: No Check-In record found for today.',
                    status: 'ERROR'
                });
            }

            // Fix Bug 2: Cannot Check-Out if already Checked-Out (Prevent double scan updates)
            if (attendance.checkOutTime) {
                return res.json({
                    message: `Already checked out today at ${dayjs(attendance.checkOutTime).format('hh:mm A')}`,
                    type: 'ALREADY_OUT',
                    data: attendance,
                    student: { fullName: student.fullName, photoUrl: student.photoUrl, id: student.studentUniqueId }
                });
            }

            const lastUpdate = attendance.checkInTime;
            const diffMinutes = dayjs(now).diff(dayjs(lastUpdate), 'minute');

            if (!forceMode && diffMinutes < 2) {
                return res.json({
                    message: 'Already scanned just now',
                    type: 'IGNORED',
                    data: attendance,
                    student: { fullName: student.fullName, photoUrl: student.photoUrl, id: student.studentUniqueId }
                });
            }

            const updated = await prisma.attendance.update({
                where: { id: attendance.id },
                data: {
                    checkOutTime: now,
                    status: 'COMPLETED'
                }
            });
            result = { message: 'Checked Out Successfully', type: 'CHECK_OUT', data: updated };
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
        
        // Normalize date to UTC midnight to match @db.Date storage strictly
        const dateStr = date ? dayjs(date).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD');
        const attendanceDate = new Date(`${dateStr}T00:00:00Z`);

        // Check for future date
        if (dayjs(dateStr).isAfter(dayjs(), 'day')) {
            return res.status(400).json({ message: 'Forbidden: Cannot mark attendance for future dates.' });
        }
        
        const auditReason = req.body.reason || 'Manual Override';

        // Scoping check
        if (req.classroomScope) {
            const student = await prisma.student.findUnique({ where: { id: parseInt(studentId) } });
            if (!student || !req.classroomScope.includes(student.classroomId)) {
                return res.status(403).json({ message: 'Forbidden: Student not in your assigned classrooms' });
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
            status: status ? status.toUpperCase() : 'PRESENT',
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
        const { classroomId, status, date } = req.body;
        const markedById = req.user.id;
        const attendanceDate = date ? new Date(date) : new Date(dayjs().format('YYYY-MM-DD'));

        // Check for future date
        if (dayjs(attendanceDate).isAfter(dayjs(), 'day')) {
            return res.status(400).json({ message: 'Forbidden: Cannot mark attendance for future dates.' });
        }

        // Use classroom scoping from middleware if exists
        let finalClassroomId = parseInt(classroomId);
        if (req.classroomScope) {
            // If scoped, must be within the allowed classrooms
            if (classroomId && !req.classroomScope.includes(parseInt(classroomId))) {
                return res.status(403).json({ message: 'Forbidden: You do not have access to this classroom' });
            }
            finalClassroomId = parseInt(classroomId) || req.classroomScope[0];
        } else if (req.user.role === 'TEACHER') {
            return res.status(403).json({ message: 'Access denied: No classroom assigned' });
        }

        if (!finalClassroomId) {
            return res.status(400).json({ message: 'Classroom ID is required' });
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
        if (studentIds.length === 0) {
            return res.json({ message: 'No active students found in this classroom', count: 0 });
        }

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

        res.json({ message: `Bulk marked ${studentIds.length} students as ${status}`, count: studentIds.length });
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
            studentWhere.classroomId = { in: req.classroomScope };
        } else if (req.user.role === 'TEACHER') {
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

        const presentDays = attendance.filter(a => ['PRESENT', 'LATE', 'COMPLETED'].includes(a.status)).length;

        // Better attendance rate: exclude weekends
        let attendanceRate = 0;
        let workingDays = 0;
        if (attendance.length > 0) {
            const earliest = dayjs(attendance[attendance.length - 1].attendanceDate);
            const latest = dayjs(attendance[0].attendanceDate);
            const rangeDays = latest.diff(earliest, 'days') + 1;

            // Count week days in range
            for (let i = 0; i < rangeDays; i++) {
                const d = earliest.add(i, 'day');
                if (d.day() !== 0 && d.day() !== 6) workingDays++;
            }
            // Use presentDays / workingDays. Note: presentDays can include weekend records
            attendanceRate = workingDays > 0 ? Math.round((presentDays / workingDays) * 100) : 100;
        }
        if (attendanceRate > 100) attendanceRate = 100;

        res.json({
            studentId: studentIdInt,
            totalDays: workingDays || attendance.length, // Display the baseline used for calculation
            presentDays,
            attendanceRate,
            history: attendance
        });
    } catch (error) {
        next(error);
    }
};
