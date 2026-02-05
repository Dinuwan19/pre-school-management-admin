const cron = require('node-cron');
const prisma = require('../config/prisma');
const dayjs = require('dayjs');

/**
 * Scheduled task to handle 9:30 AM attendance closure.
 * Marks all students without a check-in as ABSENT.
 */
const initAttendanceCron = () => {
    // Run at 09:30 every day
    // Pattern: minute hour dayOfMonth month dayOfWeek
    cron.schedule('30 9 * * *', async () => {
        try {
            const todayStr = dayjs().format('YYYY-MM-DD');
            const dayOfWeek = dayjs().day();

            // Skip weekends (0 = Sunday, 6 = Saturday)
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                console.log(`[Cron] Skipping auto-absent for weekend: ${todayStr}`);
                return;
            }

            console.log(`[Cron] Starting 9:30 AM Auto-Absent for: ${todayStr}`);

            // 1. Get all active students
            const activeStudents = await prisma.student.findMany({
                where: { status: 'ACTIVE' },
                select: { id: true }
            });

            // 2. Identify students who haven't scanned in today
            const existingAttendance = await prisma.attendance.findMany({
                where: { attendanceDate: new Date(todayStr) },
                select: { studentId: true }
            });

            const presentStudentIds = new Set(existingAttendance.map(a => a.studentId));
            const absentStudents = activeStudents.filter(s => !presentStudentIds.has(s.id));

            if (absentStudents.length === 0) {
                console.log('[Cron] All students accounted for today.');
                return;
            }

            // 3. Mark them as ABSENT
            // Using createMany for efficiency
            const absentData = absentStudents.map(s => ({
                studentId: s.id,
                attendanceDate: new Date(todayStr),
                status: 'ABSENT',
                method: 'SYSTEM',
                markedById: 1, // System User ID
                deviceId: 'CRON_JOB'
            }));

            const result = await prisma.attendance.createMany({
                data: absentData,
                skipDuplicates: true
            });

            console.log(`[Cron] Successfully marked ${result.count} students as ABSENT.`);

        } catch (error) {
            console.error('[Cron] Error in Auto-Absent task:', error);
        }
    });

    console.log('[Cron] Attendance Auto-Absent service initialized (9:30 AM daily).');
};

const initCronJobs = () => {
    initAttendanceCron();
    // Add other cron jobs here in the future
};

module.exports = { initCronJobs };
