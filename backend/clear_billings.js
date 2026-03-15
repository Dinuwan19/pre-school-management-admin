const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('--- Clearing All Billings ---');

        // 1. Delete all BillingPayment links (Safety check, though likely cleared)
        const deletedLinks = await prisma.billingpayment.deleteMany({});
        console.log(`Deleted ${deletedLinks.count} billing-payment links (cleanup).`);

        // 2. Delete all Billing records
        // This removes both Ad-hoc and Monthly fee records.
        const deletedBillings = await prisma.billing.deleteMany({});
        console.log(`Deleted ${deletedBillings.count} billing records.`);

        console.log('--- All Billing Records Cleared ---');

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
