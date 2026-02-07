const { generateInvoice } = require('../services/invoice.service');
const prisma = require('../config/prisma');

async function debugInvoice() {
    try {
        console.log('--- Debugging Invoice Generation ---');

        // Get latest payment
        const lastPayment = await prisma.payment.findFirst({
            orderBy: { createdAt: 'desc' },
            include: { billingpayment: { include: { billing: true } } }
        });

        if (!lastPayment) {
            console.log('No payments found.');
            return;
        }

        console.log(`Testing Invoice for Payment ID: ${lastPayment.id}`);
        console.log('Payment Data:', JSON.stringify(lastPayment, null, 2));

        try {
            const url = await generateInvoice(lastPayment.id);
            console.log('SUCCESS: Invoice Generated:', url);
        } catch (error) {
            console.error('FAILURE: Generation Error:', error);
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

debugInvoice();
