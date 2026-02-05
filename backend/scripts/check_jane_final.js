const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkJaneStatus() {
    const p = await prisma.payment.findFirst({
        where: { transactionRef: { contains: 'Jane' } }
    });
    console.log('Jane Payment:', p);
    await prisma.$disconnect();
}
checkJaneStatus();
