const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPayments() {
    try {
        const payments = await prisma.payment.findMany({
            orderBy: { createdAt: 'desc' },
            take: 5
        });

        console.log('--- RECENT PAYMENTS ---');
        payments.forEach(p => {
            console.log(`ID: ${p.id} | Status: ${p.status} | Amount: ${p.amountPaid}`);
            console.log(`Ref: "${p.transactionRef}"`);
            console.log('-------------------------');
        });
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkPayments();
