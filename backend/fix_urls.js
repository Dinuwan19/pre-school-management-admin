const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixUrls() {
    console.log('Starting URL fix...');

    // 1. Fix Payment table
    const payments = await prisma.payment.findMany({
        where: { invoiceUrl: { contains: '/reports/' } }
    });
    console.log(`Found ${payments.length} affected payments.`);
    for (const p of payments) {
        const newUrl = p.invoiceUrl.replace('/reports/', '/receipts/');
        await prisma.payment.update({
            where: { id: p.id },
            data: { invoiceUrl: newUrl }
        });
        console.log(`Updated Payment ${p.id} to use /receipts/`);
    }

    // 2. Fix Billing table
    const billings = await prisma.billing.findMany({
        where: { invoiceUrl: { contains: '/reports/' } }
    });
    console.log(`Found ${billings.length} affected billings.`);
    for (const b of billings) {
        const newUrl = b.invoiceUrl.replace('/reports/', '/receipts/');
        await prisma.billing.update({
            where: { id: b.id },
            data: { invoiceUrl: newUrl }
        });
        console.log(`Updated Billing ${b.id} to use /receipts/`);
    }

    console.log('Fix complete.');
    await prisma.$disconnect();
}

fixUrls().catch(console.error);
