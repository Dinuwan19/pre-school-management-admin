const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Seeding student progress...');

    // Get a student
    const student = await prisma.student.findFirst({ where: { status: 'ACTIVE' } });
    const teacher = await prisma.user.findFirst({ where: { role: 'ADMIN' } });

    if (!student || !teacher) {
        console.error('No student or teacher found to seed progress for.');
        return;
    }

    const progressData = [
        {
            studentId: student.id,
            reading: 85,
            writing: 78,
            speaking: 92,
            listening: 88,
            mathematics: 80,
            social: 85,
            remarks: 'Excellent progress in social interaction and speaking skills. Needs slight improvement in writing precision.',
            updatedById: teacher.id
        },
        {
            studentId: student.id,
            reading: 80,
            writing: 75,
            speaking: 90,
            listening: 85,
            mathematics: 78,
            social: 82,
            remarks: 'Consistent performance across all subjects. Very active in classroom activities.',
            updatedById: teacher.id
        }
    ];

    for (const data of progressData) {
        await prisma.studentprogress.create({ data });
    }

    console.log('Successfully seeded student progress.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
