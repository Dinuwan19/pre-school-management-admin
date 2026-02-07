const prisma = require('../config/prisma');

async function checkInvoice() {
    try {
        console.log('--- Checking Invoice URLs ---');
        const payment = await prisma.payment.findFirst({
            orderBy: { createdAt: 'desc' },
            include: { billingpayment: { include: { billing: true } } }
        });

        if (!payment) { console.log('No payment'); return; }

        console.log(`Payment ID: ${payment.id}`);
        console.log(`Payment InvoiceURL: ${payment.invoiceUrl}`);

        console.log('--- Linked Billings ---');
        payment.billingpayment.forEach(bp => {
            console.log(`Billing ID: ${bp.billingId}`);
            console.log(`Billing InvoiceURL: ${bp.billing.invoiceUrl}`);
        });

    } catch (e) { console.error(e); }
    finally { await prisma.$disconnect(); }
}

checkInvoice();
