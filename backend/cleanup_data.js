const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Starting Data Cleanup ---');

    try {
        // 1. Delete Billing Payments (Intermediate table)
        const bpCount = await prisma.billingpayment.deleteMany({});
        console.log(`Deleted ${bpCount.count} billingpayment records.`);

        // 2. Delete Payments
        const pCount = await prisma.payment.deleteMany({});
        console.log(`Deleted ${pCount.count} payment records.`);

        // 3. Delete Billings
        const bCount = await prisma.billing.deleteMany({});
        console.log(`Deleted ${bCount.count} billing records.`);

        // 4. Delete Homework
        const hCount = await prisma.homework.deleteMany({});
        console.log(`Deleted ${hCount.count} homework records.`);

        // 5. Delete Announcements (Stored in notification table)
        const nCount = await prisma.notification.deleteMany({});
        console.log(`Deleted ${nCount.count} announcement (notification) records.`);

        console.log('--- Cleanup Successful ---');
    } catch (error) {
        console.error('--- Cleanup Failed ---');
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
