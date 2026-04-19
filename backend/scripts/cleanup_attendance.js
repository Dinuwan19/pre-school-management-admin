const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const dayjs = require('dayjs');

async function cleanup() {
    console.log('--- Attendance Cleanup Started ---');
    const now = new Date();
    
    // Find future records
    const futureRecords = await prisma.attendance.findMany({
        where: {
            attendanceDate: {
                gt: now
            }
        }
    });

    console.log(`Found ${futureRecords.length} future attendance records.`);

    if (futureRecords.length > 0) {
        const deleteRes = await prisma.attendance.deleteMany({
            where: {
                attendanceDate: {
                    gt: now
                }
            }
        });
        console.log(`Successfully deleted ${deleteRes.count} future records.`);
    }

    console.log('--- Cleanup Finished ---');
}

cleanup()
    .catch(err => {
        console.error('Cleanup failed:', err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
