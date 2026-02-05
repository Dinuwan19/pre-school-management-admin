const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function forcePatch() {
    try {
        // 1. Get the known valid URL from ID 15
        const source = await prisma.payment.findUnique({ where: { id: 15 } });
        if (!source || !source.invoiceUrl) {
            console.log('Source ID 15 not valid.');
            return;
        }
        const validUrl = source.invoiceUrl;

        // 2. Update Jane's records
        // We target by loose string match again just to be sure we catch ID 13 or others
        const result = await prisma.payment.updateMany({
            where: {
                OR: [
                    { transactionRef: { contains: 'Jane' } },
                    { transactionRef: { contains: 'S0001' } }
                ],
                invoiceUrl: null // Only update if missing
            },
            data: { invoiceUrl: validUrl }
        });

        console.log(`Force Patched ${result.count} records with Invoice URL.`);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

forcePatch();
