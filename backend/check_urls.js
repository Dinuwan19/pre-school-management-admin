const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUrls() {
    const payments = await prisma.payment.findMany({
        where: { invoiceUrl: { not: null } },
        select: { id: true, receiptNo: true, invoiceUrl: true }
    });
    console.log('Payment Table Invoice URLs:');
    payments.forEach(p => console.log(`ID: ${p.id}, No: ${p.receiptNo}, URL: ${p.invoiceUrl}`));

    const billings = await prisma.billing.findMany({
        where: { invoiceUrl: { not: null } },
        select: { id: true, billingMonth: true, invoiceUrl: true }
    });
    console.log('\nBilling Table Invoice URLs:');
    billings.forEach(b => console.log(`ID: ${b.id}, Month: ${b.billingMonth}, URL: ${b.invoiceUrl}`));

    await prisma.$disconnect();
}

checkUrls();
