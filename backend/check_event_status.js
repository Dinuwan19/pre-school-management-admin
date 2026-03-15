const prisma = require('./config/prisma');
const dayjs = require('dayjs');

async function checkEvents() {
    const events = await prisma.event.findMany({
        where: {
            status: 'COMPLETED'
        },
        select: { id: true, title: true, eventDate: true, status: true }
    });

    console.log('--- Completed Events ---');
    console.log(events);

    const today = dayjs().startOf('day');
    const incorrect = events.filter(e => dayjs(e.eventDate).isSame(today, 'day') || dayjs(e.eventDate).isAfter(today));

    console.log('--- Incorrectly Completed (Today or Future) ---');
    console.log(incorrect);
}

checkEvents()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
