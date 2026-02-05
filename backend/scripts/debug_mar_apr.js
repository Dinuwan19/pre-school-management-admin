const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMarApr() {
    try {
        console.log('--- Checking Mar/Apr 2026 Records for Student 1 ---'); // Assuming Student 1 based on context

        // 1. Check Billings
        const billings = await prisma.billing.findMany({
            where: {
                studentId: 1,
                billingMonth: { in: ['2026-03', '2026-04'] }
            }
        });
        console.log('Billings:', billings);

        // 2. Check Payments (Text Match)
        const payments = await prisma.payment.findMany({
            where: {
                OR: [
                    { transactionRef: { contains: 'March' } },
                    { transactionRef: { contains: 'April' } },
                    { transactionRef: { contains: 'Mar' } },
                    { transactionRef: { contains: 'Apr' } }
                ]
            }
        });
        console.log('Payments with Month Text:', payments.map(p => ({
            id: p.id,
            status: p.status,
            ref: p.transactionRef,
            createdAt: p.createdAt
        })));

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
checkMarApr();
