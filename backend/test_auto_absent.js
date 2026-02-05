const { initAttendanceCron } = require('./src/services/cron.service');
const prisma = require('./src/config/prisma');
const dayjs = require('dayjs');

async function testAutoAbsent() {
    console.log('--- Manual Auto-Absent Trigger Test ---');

    // We can't easily wait for the cron, so let's extract the logic into a testable function 
    // or just run the same logic here.

    try {
        const todayStr = dayjs().format('YYYY-MM-DD');
        console.log(`Target Date: ${todayStr}`);

        const activeStudents = await prisma.student.findMany({
            where: { status: 'ACTIVE' },
            select: { id: true, fullName: true }
        });

        const existingAttendance = await prisma.attendance.findMany({
            where: { attendanceDate: new Date(todayStr) },
            select: { studentId: true }
        });

        const presentStudentIds = new Set(existingAttendance.map(a => a.studentId));
        const absentStudents = activeStudents.filter(s => !presentStudentIds.has(s.id));

        console.log(`Total Active Students: ${activeStudents.length}`);
        console.log(`Already Scanned: ${presentStudentIds.size}`);
        console.log(`Students to be marked ABSENT: ${absentStudents.length}`);

        if (absentStudents.length > 0) {
            const absentData = absentStudents.map(s => ({
                studentId: s.id,
                attendanceDate: new Date(todayStr),
                status: 'ABSENT',
                method: 'SYSTEM',
                markedById: 1,
                deviceId: 'MANUAL_TEST_TRIGGER'
            }));

            const result = await prisma.attendance.createMany({
                data: absentData,
                skipDuplicates: true
            });

            console.log(`SUCCESS: Marked ${result.count} students as ABSENT.`);
        } else {
            console.log('No students to mark absent.');
        }

    } catch (error) {
        console.error('FAILED:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testAutoAbsent();
