const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const payments = await prisma.payment.findMany({
        where: { paymentMethod: 'CASH' },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, receiptNo: true, invoiceUrl: true, status: true, createdAt: true }
    });
    console.log(JSON.stringify(payments, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
