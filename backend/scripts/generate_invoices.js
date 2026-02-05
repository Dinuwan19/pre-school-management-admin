const { PrismaClient } = require('@prisma/client');
const { generateInvoice } = require('../src/services/invoice.service');
const prisma = new PrismaClient();

async function generateMissingInvoices() {
    try {
        console.log('Searching for APPROVED payments without invoices...');

        // Find payments that are APPROVED (like Cash) but have no invoiceUrl
        const payments = await prisma.payment.findMany({
            where: {
                status: { in: ['APPROVED', 'PAID'] },
                invoiceUrl: null,
                transactionRef: { contains: 'Jane' } // Target Jane specifically first
            }
        });

        console.log(`Found ${payments.length} payments.`);

        for (const p of payments) {
            console.log(`Generating invoice for Payment ${p.id}...`);
            const url = await generateInvoice(p.id);

            // Save URL to payment
            await prisma.payment.update({
                where: { id: p.id },
                data: { invoiceUrl: url }
            });
            console.log(`Saved Invoice URL: ${url}`);
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

generateMissingInvoices();
