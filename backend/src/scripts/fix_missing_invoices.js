const prisma = require('../config/prisma');

async function fixInvoices() {
    try {
        console.log('Fixing Missing Invoices...');

        // Find payments that are approved, have an invoiceUrl, but have linked billings WITHOUT invoiceUrl
        const payments = await prisma.payment.findMany({
            where: {
                status: 'APPROVED',
                invoiceUrl: { not: null }
            },
            include: {
                billingpayment: {
                    include: { billing: true }
                }
            }
        });

        let fixedCount = 0;

        for (const p of payments) {
            const billingIdsToUpdate = [];

            for (const bp of p.billingpayment) {
                if (!bp.billing.invoiceUrl) {
                    billingIdsToUpdate.push(bp.billingId);
                }
            }

            if (billingIdsToUpdate.length > 0) {
                console.log(`Payment ${p.id} has invoice, but Billings [${billingIdsToUpdate.join(',')}] do not. Fixing...`);

                await prisma.billing.updateMany({
                    where: { id: { in: billingIdsToUpdate } },
                    data: { invoiceUrl: p.invoiceUrl }
                });

                fixedCount += billingIdsToUpdate.length;
            }
        }

        console.log(`Fixed ${fixedCount} billing records.`);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

fixInvoices();
