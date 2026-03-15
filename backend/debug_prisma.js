const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const staff = await prisma.user.findMany({
            where: { role: 'TEACHER' },
            include: {
                teacherprofile: {
                    include: {
                        classrooms: true,
                        qualifications: true
                    }
                }
            }
        });
        console.log('Success:', staff.length);
    } catch (error) {
        console.error('Error details:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
