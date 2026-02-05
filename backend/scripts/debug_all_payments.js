const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugAll() {
    try {
        const payments = await prisma.payment.findMany({
            take: 10,
            orderBy: { id: 'desc' }
        });

        console.log('--- LAST 10 PAYMENTS ---');
        payments.forEach(p => {
            console.log(`[ID: ${p.id}] Ref: "${p.transactionRef}" | Invoice: ${p.invoiceUrl}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
debugAll();
