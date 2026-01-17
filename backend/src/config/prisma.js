const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
    // Initializing with logging to help debug
    log: ['query', 'info', 'warn', 'error'],
});

module.exports = prisma;
