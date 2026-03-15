const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const dayjs = require('dayjs');

async function fixEvents() {
    console.log('--- Starting Event Status Fix ---');

    // 1. Find all COMPLETED events
    const events = await prisma.event.findMany({
        where: {
            status: 'COMPLETED'
        }
    });

    console.log(`Found ${events.length} COMPLETED events.`);

    const startOfToday = new dayjs().startOf('day');
    const todayStr = startOfToday.format('YYYY-MM-DD');
    console.log(`Today is: ${todayStr} (Start of Day)`);

    let fixCount = 0;

    for (const event of events) {
        const eventDate = dayjs(event.eventDate);

        // Check if event is Today or Future
        if (eventDate.isSame(startOfToday, 'day') || eventDate.isAfter(startOfToday)) {
            console.log(`FIXING Event [${event.id}] "${event.title}" - Date: ${event.eventDate}`);

            await prisma.event.update({
                where: { id: event.id },
                data: { status: 'UPCOMING' }
            });
            fixCount++;
        }
    }

    console.log(`--- Finished. Fixed ${fixCount} events. ---`);
}

fixEvents()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
