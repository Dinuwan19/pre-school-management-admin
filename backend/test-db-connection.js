const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Testing database connection...');
        await prisma.$connect();
        console.log('Successfully connected to the database!');
        const tables = await prisma.$queryRaw`SHOW TABLES`;
        console.log('Tables in database:', tables);
    } catch (error) {
        console.error('Failed to connect to the database:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
