const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const media = await prisma.event_media.findMany({
        where: { eventId: 1 }
    });
    console.log(JSON.stringify(media, null, 2));
}

main().finally(() => prisma.$disconnect());
