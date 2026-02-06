const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const user = await prisma.user.findUnique({
        where: { username: 'admin' }
    });
    console.log('--- ADMIN USER CHECK ---');
    console.log(JSON.stringify(user, null, 2));
    process.exit(0);
}

check();
