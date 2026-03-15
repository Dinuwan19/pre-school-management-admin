const prisma = require('../backend/src/config/prisma');

async function checkData() {
    try {
        const total = await prisma.assessment.count();
        console.log(`Total Assessments in DB: ${total}`);

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const thisMonth = await prisma.assessment.count({
            where: { updatedAt: { gte: startOfMonth } }
        });
        console.log(`Assessments This Month: ${thisMonth}`);

        const latest = await prisma.assessment.findFirst({
            orderBy: { updatedAt: 'desc' }
        });
        console.log('Latest Assessment:', latest ? latest.updatedAt : 'None');

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkData();
