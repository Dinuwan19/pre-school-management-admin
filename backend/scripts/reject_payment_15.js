const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function rejectPayment() {
    try {
        console.log('--- REJECTING PAYMENT ID 15 ---');
        const p = await prisma.payment.update({
            where: { id: 15 },
            data: { status: 'REJECTED' }
        });
        console.log('Updated Payment 15:', p);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
rejectPayment();
