const prisma = require('../config/prisma');
const dayjs = require('dayjs');

exports.markAttendance = async (req, res, next) => {
    try {
        const { studentId, type } = req.body; // type: 'CHECK_IN' or 'CHECK_OUT'
        const today = dayjs().format('YYYY-MM-DD');
        const now = new Date();

        // 1. Find or Create attendance record for today
        let attendance = await prisma.attendance.findFirst({
            where: {
                studentId: parseInt(studentId),
                attendanceDate: new Date(today)
            }
        });

        if (type === 'CHECK_IN') {
            if (attendance && attendance.checkInTime) {
                return res.status(400).json({ message: 'Already checked in today' });
            }

            if (!attendance) {
                attendance = await prisma.attendance.create({
                    data: {
                        studentId: parseInt(studentId),
                        attendanceDate: new Date(today),
                        checkInTime: now,
                        markedById: req.user ? req.user.id : 1
                    }
                });
            } else {
                attendance = await prisma.attendance.update({
                    where: { id: attendance.id },
                    data: { checkInTime: now }
                });
            }
        } else if (type === 'CHECK_OUT') {
            if (!attendance || !attendance.checkInTime) {
                return res.status(400).json({ message: 'Must check in before checking out' });
            }
            if (attendance.checkOutTime) {
                return res.status(400).json({ message: 'Already checked out today' });
            }

            attendance = await prisma.attendance.update({
                where: { id: attendance.id },
                data: { checkOutTime: now }
            });
        }

        const displayType = type ? type.replace('_', ' ').toLowerCase() : 'marked attendance';
        res.json({ message: `Successfully ${displayType}`, attendance });
    } catch (error) {
        next(error);
    }
};

exports.getDailyAttendance = async (req, res, next) => {
    try {
        const date = req.query.date || dayjs().format('YYYY-MM-DD');
        let where = { attendanceDate: new Date(date) };

        // Data Scoping for Teacher
        if (req.user.role === 'TEACHER') {
            const teacherProfile = await prisma.teacherprofile.findUnique({
                where: { teacherId: req.user.id }
            });

            if (!teacherProfile || !teacherProfile.assignedClassroomId) {
                return res.json([]); // No classroom assigned, no records visible
            }
            // Filter attendance records by student's classroom
            where.student = { classroomId: teacherProfile.assignedClassroomId };
        }

        const attendance = await prisma.attendance.findMany({
            where: where,
            include: {
                student: {
                    select: {
                        fullName: true,
                        studentUniqueId: true,
                        photoUrl: true,
                        classroom: { select: { name: true } }
                    }
                }
            }
        });
        res.json(attendance);
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
            const parentProfile = await prisma.parent.findFirst({ where: { email: req.user.username } });

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
