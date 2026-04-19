const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
    console.log('🚀 Starting Database Recovery...');
    try {
        // 1. Fix orphan billing categories
        console.log('🧹 Cleaning up orphan billing records...');
        const result = await prisma.$executeRaw`
            UPDATE billing 
            SET categoryId = NULL 
            WHERE categoryId IS NOT NULL 
            AND categoryId NOT IN (SELECT id FROM billingcategory)
        `;
        console.log(`✅ Cleaned up ${result} records.`);

        console.log('\n--- SUCCESS ---');
        console.log('Now you can run: npx prisma db push');
    } catch (error) {
        console.error('❌ Error during recovery:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fix();
