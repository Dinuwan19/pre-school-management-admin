const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const dayjs = require('dayjs');

async function main() {
    const start = dayjs().startOf('year').toDate();
    const end = dayjs().toDate();

    const attendanceCount = await prisma.attendance.count({
        where: {
            attendanceDate: { gte: start, lte: end }
        }
    });

    const assessmentsCount = await prisma.assessment.count();

    console.log(`Attendance Records (2026): ${attendanceCount}`);
    console.log(`Total Assessments: ${assessmentsCount}`);

    if (attendanceCount > 0) {
        const byMonth = await prisma.attendance.groupBy({
            by: ['attendanceDate'],
            _count: true
        });
        // Simplistic grouping for debugging
        const months = {};
        byMonth.forEach(b => {
            const m = dayjs(b.attendanceDate).format('YYYY-MM');
            months[m] = (months[m] || 0) + b._count;
        });
        console.log('Attendance by Month:', months);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
