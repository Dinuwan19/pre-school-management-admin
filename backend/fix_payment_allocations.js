const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { generateInvoice } = require('./src/services/invoice.service');

async function main() {
    try {
        console.log('--- Fixing Payment 11 Allocations ---');
        const paymentId = 11;

        const payment = await prisma.payment.findUnique({
            where: { id: paymentId },
            include: {
                billingpayment: {
                    include: { billing: true }
                }
            }
        });

        if (!payment) {
            console.log('Payment not found');
            return;
        }

        console.log('Current Allocations:');
        payment.billingpayment.forEach(bp => {
            console.log(` - BillingID: ${bp.billingId}, Month: ${bp.billing.billingMonth}, Amount: ${bp.billing.amount}, CatID: ${bp.billing.categoryId}`);
        });

        // Identify the bad billing (Adhoc, 45000)
        const badLink = payment.billingpayment.find(bp => bp.billing.billingMonth === 'Adhoc' && parseFloat(bp.billing.amount) === 45000);

        if (badLink) {
            console.log(`Found Bad Billing Link: BillingID ${badLink.billingId}`);

            // 1. Delete Link
            await prisma.billingpayment.delete({
                where: {
                    billingId_paymentId: {
                        billingId: badLink.billingId,
                        paymentId: paymentId
                    }
                }
            });
            console.log('Deleted billingpayment link.');

            // 2. Delete Billing
            await prisma.billing.delete({
                where: { id: badLink.billingId }
            });
            console.log('Deleted bad billing record.');

            // 3. Regenerate Invoice
            console.log('Regenerating Invoice...');
            const newInvoiceUrl = await generateInvoice(paymentId);
            console.log(`New Invoice URL: ${newInvoiceUrl}`);

            // Update payment with new URL (generateInvoice usually returns URL but doesn't auto-save to payment if called standalone? Check controller.)
            // Controller: await prisma.payment.update({ data: { invoiceUrl } });
            // generateInvoice likely returns the path.

            await prisma.payment.update({
                where: { id: paymentId },
                data: { invoiceUrl: newInvoiceUrl }
            });
            console.log('Payment updated with new invoice URL.');

            // 4. Also update linked billings with new invoice URL
            const validBillingIds = payment.billingpayment
                .filter(bp => bp.billingId !== badLink.billingId)
                .map(bp => bp.billingId);

            if (validBillingIds.length > 0) {
                await prisma.billing.updateMany({
                    where: { id: { in: validBillingIds } },
                    data: { invoiceUrl: newInvoiceUrl }
                });
                console.log('Updated valid billings with new invoice URL.');
            }

        } else {
            console.log('No matching bad billing found to delete.');
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
