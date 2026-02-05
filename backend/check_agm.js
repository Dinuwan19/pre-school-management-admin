const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const events = await prisma.event.findMany({
            where: {
                title: {
                    contains: 'AGM',
                }
            },
            include: {
                event_media: true
            }
        });

        console.log('FOUND_EVENTS_START');
        console.log(JSON.stringify(events, null, 2));
        console.log('FOUND_EVENTS_END');
    } catch (err) {
        console.error('ERROR_START');
        console.error(err);
        console.error('ERROR_END');
    } finally {
        await prisma.$disconnect();
    }
}

main();
