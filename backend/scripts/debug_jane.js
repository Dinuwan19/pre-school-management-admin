const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkJaneDoe() {
    try {
        const student = await prisma.student.findFirst({
            where: { fullName: { contains: 'Jane' } }
        });

        if (!student) {
            console.log('Jane Doe not found');
            return;
        }

        console.log(`Found Student: ${student.fullName} (${student.id}) | UID: ${student.studentUniqueId}`);

        const payments = await prisma.payment.findMany({
            where: {
                OR: [
                    { transactionRef: { contains: student.fullName } },
                    { transactionRef: { contains: student.studentUniqueId } }
                ]
            },
            include: { billingpayment: true },
            orderBy: { createdAt: 'desc' }
        });

        console.log('--- PAYMENTS ---');
        payments.forEach(p => {
            console.log(`ID: ${p.id} | Status: ${p.status} | Amount: ${p.amountPaid}`);
            console.log(`Ref: "${p.transactionRef}"`);
            console.log(`Receipt URL: ${p.receiptUrl}`);
            console.log(`Billing Links: ${p.billingpayment.length}`);
            console.log('-------------------------');
        });

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkJaneDoe();
