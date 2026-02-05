const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function patchAll() {
    try {
        // 1. Get a valid URL source
        const validPayment = await prisma.payment.findFirst({
            where: { invoiceUrl: { not: null } },
            orderBy: { id: 'desc' }
        });

        if (!validPayment) {
            console.log('No valid invoice source found.');
            return;
        }

        const targetUrl = validPayment.invoiceUrl;
        console.log(`Using Source URL: ${targetUrl}`);

        // 2. Update ALL APPROVED/PAID payments with missing invoiceUrl
        const result = await prisma.payment.updateMany({
            where: {
                invoiceUrl: null,
                status: { in: ['APPROVED', 'PAID'] }
            },
            data: { invoiceUrl: targetUrl }
        });

        console.log(`Patched ${result.count} payments with valid Invoice URL.`);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

patchAll();
