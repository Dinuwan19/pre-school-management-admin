const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findJane() {
    try {
        const payments = await prisma.payment.findMany({
            where: {
                OR: [
                    { transactionRef: { contains: 'Jane' } },
                    { transactionRef: { contains: 'S0001' } }
                ]
            },
            take: 5
        });

        console.log('--- FOUND PAYMENTS ---');
        payments.forEach(p => {
            console.log(`ID: ${p.id} | Ref: ${p.transactionRef} | Invoice: ${p.invoiceUrl}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
findJane();
