const prisma = require('../config/prisma');

async function testWrite() {
    try {
        console.log('Testing Write with Frequency...');
        // Create a dummy category
        const cat = await prisma.billingCategory.create({
            data: {
                name: 'Test Freq',
                amount: 100,
                status: 'INACTIVE', // cleanup later
                validUntil: new Date(),
                frequency: 'ONE_TIME' // This will fail if client is outdated
            }
        });
        console.log('SUCCESS:', cat);

        // Cleanup
        await prisma.billingCategory.delete({ where: { id: cat.id } });
    } catch (e) {
        console.error('FAILURE:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

testWrite();
