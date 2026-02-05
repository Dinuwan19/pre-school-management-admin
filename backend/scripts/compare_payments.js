const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function compareRecords() {
    try {
        // 1. Get Jane's "Cash" Payment
        const janeData = await prisma.payment.findFirst({
            where: { transactionRef: { contains: 'Jane' } },
            include: { billingpayment: { include: { billing: true } } }
        });

        // 2. Get a "Standard" Online Payment (if any) or Billing
        const standardData = await prisma.payment.findFirst({
            where: {
                NOT: { id: janeData?.id },
                status: 'APPROVED'
            },
            include: { billingpayment: { include: { billing: true } } }
        });

        console.log('--- JANE DOE RECORD (Cash) ---');
        console.log(JSON.stringify(janeData, null, 2));

        console.log('\n--- STANDARD RECORD (Online/Billing) ---');
        console.log(JSON.stringify(standardData, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

compareRecords();
