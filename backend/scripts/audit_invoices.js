const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMissingInvoices() {
    try {
        console.log('--- PAYMENTS WITH NULL INVOICE URL ---');
        const missing = await prisma.payment.findMany({
            where: {
                invoiceUrl: null,
                status: 'APPROVED' // Only concerned about approved ones that should have invoices
            },
            select: {
                id: true,
                status: true,
                paymentMethod: true,
                transactionRef: true,
                invoiceUrl: true
            }
        });

        if (missing.length === 0) {
            console.log('Great! No APPROVED payments have null invoiceUrl.');
        } else {
            console.log(`Found ${missing.length} payments missing invoices:`);
            missing.forEach(p => console.log(p));
        }

        console.log('\n--- SAMPLE CASH PAYMENT ---');
        const sample = await prisma.payment.findFirst({
            where: {
                OR: [
                    { paymentMethod: 'CASH' },
                    { transactionRef: { contains: 'Cash' } }
                ]
            }
        });
        console.log(sample);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
checkMissingInvoices();
