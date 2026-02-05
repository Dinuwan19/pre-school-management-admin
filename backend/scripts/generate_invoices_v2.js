require('dotenv').config({ path: '../.env' }); // Load env from backend root
const { PrismaClient } = require('@prisma/client');
const { generateInvoice } = require('../src/services/invoice.service');
const prisma = new PrismaClient();

async function generateMissingInvoices() {
    try {
        console.log('--- GENERATING MISSING INVOICES ---');

        // Find payments that are APPROVED/PAID but have no invoiceUrl
        // Targeting Jane Doe specifically by Ref to be safe
        const payments = await prisma.payment.findMany({
            where: {
                transactionRef: { contains: 'Jane' },
                status: { in: ['APPROVED', 'PAID'] },
                invoiceUrl: null
            }
        });

        console.log(`Found ${payments.length} target payments.`);

        for (const p of payments) {
            console.log(`Generating invoice for Payment ${p.id}...`);
            try {
                // generateInvoice updates the DB itself usually, but let's check
                const url = await generateInvoice(p.id);
                console.log(`Success! URL: ${url}`);
            } catch (err) {
                console.error(`Failed for ${p.id}:`, err);
            }
        }
    } catch (e) {
        console.error('Script Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

generateMissingInvoices();
