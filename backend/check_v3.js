const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const billingStats = await prisma.billing.groupBy({
        by: ['status'],
        _count: { id: true }
    });

    const recentEvents = await prisma.event.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' }
    });

    const progressCount = await prisma.studentprogress.count();

    console.log('--- DB Health Check ---');
    console.log('Billing Statuses:', JSON.stringify(billingStats));
    console.log('Progress Records:', progressCount);
    console.log('Recent Events:', JSON.stringify(recentEvents.map(e => ({ id: e.id, title: e.title, status: e.status }))));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
