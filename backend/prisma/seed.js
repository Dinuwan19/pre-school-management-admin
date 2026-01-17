// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const username = 'admin';
    const password = 'password123';

    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
        where: { username },
    });

    if (existingAdmin) {
        console.log('User "admin" already exists.');
        return;
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the Super Admin
    const user = await prisma.user.create({
        data: {
            username,
            password: hashedPassword,
            role: 'SUPER_ADMIN',
            fullName: 'Super Admin', // Updated from name
            status: 'ACTIVE',
            firstLogin: true,
        },
    });

    console.log(`Created Super Admin user with id: ${user.id}`);
    console.log(`Username: ${username}`);
    console.log(`Password: ${password}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
