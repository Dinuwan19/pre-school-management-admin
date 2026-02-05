const prisma = require('./src/config/prisma');
const dayjs = require('dayjs');

async function resetTodayAttendance() {
    console.log('--- Resetting Today\'s Attendance for Testing ---');
    try {
        const todayStr = dayjs().format('YYYY-MM-DD');
        console.log(`Target Date: ${todayStr}`);

        // 1. Delete audit logs for today's attendance first
        await prisma.attendanceaudit.deleteMany({
            where: {
                attendance: {
                    attendanceDate: new Date(todayStr)
                }
            }
        });

        // 2. Delete all attendance records for today
        const result = await prisma.attendance.deleteMany({
            where: {
                attendanceDate: new Date(todayStr)
            }
        });

        console.log(`SUCCESS: Deleted ${result.count} attendance records for today.`);
        console.log('All students should now show as "NOT MARKED" in the portal.');

    } catch (error) {
        console.error('FAILED:', error);
    } finally {
        await prisma.$disconnect();
    }
}

resetTodayAttendance();
