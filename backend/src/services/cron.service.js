const cron = require('node-cron');
const prisma = require('../config/prisma');
const { logAction } = require('./audit.service');
const dayjs = require('dayjs');

const initCronJobs = () => {
    console.log('Initializing Cron Jobs...');

    // Rule: Mark ABSENT at 10:00 AM daily for students with no record
    // Cron syntax: 0 10 * * * (At 10:00:00am every day)
    cron.schedule('0 10 * * *', async () => {
        console.log('Running Auto-Absent Job...');
        try {
            const todayStr = dayjs().format('YYYY-MM-DD');
            const todayDate = new Date(todayStr);

            // 1. Get all active students
            const activeStudents = await prisma.student.findMany({
                where: { status: 'ACTIVE' },
                select: { id: true }
            });

            // 2. Get all students who have a record for today
            const presentAttendance = await prisma.attendance.findMany({
                where: { attendanceDate: todayDate },
                select: { studentId: true }
            });

            const presentStudentIds = new Set(presentAttendance.map(a => a.studentId));

            // 3. Filter missing students
            const missingStudents = activeStudents.filter(s => !presentStudentIds.has(s.id));

            if (missingStudents.length === 0) {
                console.log('No missing students found.');
                return;
            }

            // 4. Bulk create ABSENT records
            // Prisma createMany is supported in MySQL
            const recordsToCreate = missingStudents.map(s => ({
                studentId: s.id,
                attendanceDate: todayDate,
                status: 'ABSENT',
                method: 'SYSTEM',
                markedById: 1 // System/Admin user
            }));

            const result = await prisma.attendance.createMany({
                data: recordsToCreate,
                skipDuplicates: true
            });

            console.log(`Auto-Absent Job Complete. Marked ${result.count} students as ABSENT.`);
            await logAction(1, `AUTO_ABSENT_JOB: Marked ${result.count} students absent`);

        } catch (error) {
            console.error('Error in Auto-Absent Job:', error);
        }
    });

    console.log('Cron Jobs Scheduled.');
};

module.exports = { initCronJobs };
