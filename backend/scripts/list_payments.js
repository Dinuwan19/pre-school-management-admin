const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listLastPayments() {
    const payments = await prisma.payment.findMany({
        take: 5,
        orderBy: { id: 'desc' }
    });
    console.log(payments);
    await prisma.$disconnect();
}
listLastPayments();
