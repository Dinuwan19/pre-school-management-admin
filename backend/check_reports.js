const prisma = require('./src/config/prisma');
const dayjs = require('dayjs');

async function checkReports() {
    console.log('Checking recent report logs...');
    try {
        const reports = await prisma.report_log.findMany({
            orderBy: { createdAt: 'desc' },
            take: 5
        });
        console.log('Recent Reports:', JSON.stringify(reports, null, 2));
    } catch (error) {
        console.error('Error fetching reports:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkReports();
