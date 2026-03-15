const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('--- Clearing All Payments and Invoices ---');

        // 1. Delete all links in BillingPayment (Junction table)
        const deletedLinks = await prisma.billingpayment.deleteMany({});
        console.log(`Deleted ${deletedLinks.count} billing-payment links.`);

        // 2. Delete all Payments
        const deletedPayments = await prisma.payment.deleteMany({});
        console.log(`Deleted ${deletedPayments.count} payments.`);

        // 3. Reset all Billings to UNPAID and clear invoiceUrl
        const updatedBillings = await prisma.billing.updateMany({
            data: {
                status: 'UNPAID',
                invoiceUrl: null,
                // If there are other fields like `paidAt` or similar, reset them too. 
                // Based on schema, strict schema check might be needed, but 'status' and 'invoiceUrl' are key.
            }
        });
        console.log(`Reset ${updatedBillings.count} billings to UNPAID and cleared invoice URLs.`);

        console.log('--- Data Cleared Successfully ---');

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
