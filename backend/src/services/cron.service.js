const cron = require('node-cron');
const prisma = require('../config/prisma');
const dayjs = require('dayjs');

/**
 * Scheduled task to handle 9:30 AM attendance closure.
 * Marks all students without a check-in as ABSENT.
 */
/**
 * Core logic to mark students as absent.
 * Can be called by cron or on startup.
 */
const markAbsentStudents = async () => {
    try {
        const todayStr = dayjs().format('YYYY-MM-DD');
        const dayOfWeek = dayjs().day();

        // Skip weekends (0 = Sunday, 6 = Saturday)
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            console.log(`[Attendance Service] Skipping auto-absent for weekend: ${todayStr}`);
            return;
        }

        console.log(`[Attendance Service] Running Auto-Absent Check for: ${todayStr}`);

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
            console.log('[Attendance Service] All students accounted for today.');
            return;
        }

        // 3. Mark them as ABSENT
        const absentData = absentStudents.map(s => ({
            studentId: s.id,
            attendanceDate: new Date(todayStr),
            status: 'ABSENT',
            method: 'SYSTEM',
            markedById: 1, // System User ID
            deviceId: 'SYSTEM_AUTO'
        }));

        const result = await prisma.attendance.createMany({
            data: absentData,
            skipDuplicates: true
        });

        console.log(`[Attendance Service] Successfully marked ${result.count} students as ABSENT.`);
        return result.count;

    } catch (error) {
        console.error('[Attendance Service] Error in Auto-Absent task:', error);
        throw error;
    }
};

const initAttendanceCron = () => {
    // Run at 09:30 every day
    cron.schedule('30 9 * * *', async () => {
        console.log('[Cron] Triggering 9:30 AM Auto-Absent...');
        await markAbsentStudents();
    });

    console.log('[Cron] Attendance Auto-Absent service initialized (9:30 AM daily).');
};

const checkTomorrowSpecialDay = async () => {
    try {
        const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD');
        console.log(`[Special Day Service] Checking for special day on: ${tomorrow}`);

        const specialDay = await prisma.special_day.findUnique({
            where: { date: new Date(tomorrow) }
        });

        if (specialDay) {
            console.log(`[Special Day Service] Found special day: ${specialDay.name}. Sending notifications...`);
            
            // Create a global notification for all parents
            await prisma.notification.create({
                data: {
                    title: `Special Day Tomorrow: ${specialDay.name}`,
                    message: `Reminder: Tomorrow (${tomorrow}) is a special day (${specialDay.name}). Preschool will not be held. ${specialDay.description || ''}`,
                    targetRole: 'PARENT',
                    createdById: 1 // System user
                }
            });
            console.log(`[Special Day Service] Notification sent successfully.`);
        } else {
            console.log(`[Special Day Service] No special day found for tomorrow.`);
        }
    } catch (error) {
        console.error('[Special Day Service] Error in checkTomorrowSpecialDay:', error);
    }
};

const initSpecialDayNotifications = () => {
    // Run at 20:00 (8 PM) every day
    cron.schedule('0 20 * * *', async () => {
        console.log('[Cron] Triggering 8:00 PM Special Day check...');
        await checkTomorrowSpecialDay();
    });

    console.log('[Cron] Special Day notification service initialized (8:00 PM daily).');
};

const initCronJobs = () => {
    initAttendanceCron();
    initSpecialDayNotifications();
};

module.exports = { initCronJobs, markAbsentStudents };
