const prisma = require('../config/prisma');

async function checkSchema() {
    try {
        // Try to create a dummy category with frequency to see if it throws validation error
        // Or just inspect table info via raw query
        const result = await prisma.$queryRaw`SHOW COLUMNS FROM BillingCategory LIKE 'frequency'`;
        console.log('Column Info:', result);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkSchema();
