const cron = require('node-cron');
const prisma = require('../config/prisma');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

const TIMEZONE = 'Asia/Colombo';

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
        const todayStr = dayjs().tz(TIMEZONE).format('YYYY-MM-DD');
        const dayOfWeek = dayjs().tz(TIMEZONE).day();

        // Skip weekends (0 = Sunday, 6 = Saturday)
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            console.log(`[Attendance Service] Skipping auto-absent for weekend: ${todayStr}`);
            return;
        }

        console.log(`[Attendance Service] Running Auto-Absent Check for: ${todayStr}`);

        // 1. Get a valid System User (Super Admin) to avoid FK errors
        const systemUser = await prisma.user.findFirst({
            where: { role: 'SUPER_ADMIN', status: 'ACTIVE' },
            select: { id: true }
        });

        if (!systemUser) {
            console.error('[Attendance Service] CRITICAL: No ACTIVE Super Admin found to mark attendance.');
            return;
        }

        // 2. Get all active students
        const activeStudents = await prisma.student.findMany({
            where: { status: 'ACTIVE' },
            select: { id: true }
        });

        // 3. Identify students who haven't scanned in today
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

        // 4. Mark them as ABSENT
        const absentData = absentStudents.map(s => ({
            studentId: s.id,
            attendanceDate: new Date(todayStr),
            status: 'ABSENT',
            method: 'SYSTEM',
            markedById: systemUser.id,
            deviceId: 'SYSTEM_AUTO'
        }));

        console.log(`[Attendance Service] Attempting to mark ${absentData.length} students as ABSENT...`);

        const result = await prisma.attendance.createMany({
            data: absentData,
            skipDuplicates: true
        });

        console.log(`[Attendance Service] SUCCESS: Marked ${result.count} students as ABSENT.`);
        return result.count;

    } catch (error) {
        console.error('[Attendance Service] ERROR in Auto-Absent task:', error.message);
        if (error.code === 'P2003') {
            console.error('[Attendance Service] TIP: This is a Foreign Key error. Check if IDs exist.');
        }
        throw error;
    }
};

const initAttendanceCron = () => {
    // Run at 09:30 every day in local timezone
    cron.schedule('30 9 * * *', async () => {
        console.log('[Cron] Triggering 9:30 AM Auto-Absent...');
        await markAbsentStudents();
    }, {
        scheduled: true,
        timezone: TIMEZONE
    });

    console.log(`[Cron] Attendance Auto-Absent service initialized (9:30 AM daily, ${TIMEZONE}).`);
};

const checkTomorrowSpecialDay = async () => {
    try {
        const tomorrow = dayjs().tz(TIMEZONE).add(1, 'day').format('YYYY-MM-DD');
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
    // Run at 20:00 (8 PM) every day in local timezone
    cron.schedule('0 20 * * *', async () => {
        console.log('[Cron] Triggering 8:00 PM Special Day check...');
        await checkTomorrowSpecialDay();
    }, {
        scheduled: true,
        timezone: TIMEZONE
    });

    console.log(`[Cron] Special Day notification service initialized (8:00 PM daily, ${TIMEZONE}).`);
};

const initCronJobs = () => {
    initAttendanceCron();
    initSpecialDayNotifications();
};

module.exports = { initCronJobs, markAbsentStudents };

