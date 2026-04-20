const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLogs() {
    try {
        const logs = await prisma.report_log.findMany({
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { fullName: true } } }
        });
        
        console.log('--- RECENT REPORT LOGS ---');
        logs.forEach(log => {
            console.log(`ID: ${log.id} | Type: ${log.reportType} | Path: ${log.filePath} | GeneratedBy: ${log.user?.fullName || 'NULL'} | Created: ${log.createdAt}`);
        });
    } catch (error) {
        console.error('Error fetching logs:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkLogs();
