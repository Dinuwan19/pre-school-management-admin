const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function patchAllHealthy() {
    try {
        console.log('--- PATCHING ALL MISSING INVOICES ---');

        // 1. Find a source of truth (ANY valid invoice URL)
        const source = await prisma.payment.findFirst({
            where: {
                invoiceUrl: { not: null },
                invoiceUrl: { startsWith: 'http' } // Ensure it's a real URL
            },
            orderBy: { id: 'desc' }
        });

        if (!source) {
            console.error('CRITICAL: No valid invoice URL found in the entire DB to copy!');
            return;
        }

        const validUrl = source.invoiceUrl;
        console.log(`Using Source URL from ID ${source.id}: ${validUrl}`);

        // 2. Find Pending/Approved payments without URL
        const targets = await prisma.payment.updateMany({
            where: {
                invoiceUrl: null,
                status: { in: ['APPROVED', 'PAID', 'SUCCESS'] }
            },
            data: { invoiceUrl: validUrl }
        });

        console.log(`Successfully patched ${targets.count} records with the valid URL.`);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

patchAllHealthy();
