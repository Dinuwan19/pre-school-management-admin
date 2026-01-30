const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
    const password = await bcrypt.hash('password123', 10);

    // 1. Ensure SUPERADMIN exists
    const superAdmin = await prisma.user.upsert({
        where: { username: 'superadmin' },
        update: {
            password: password,
            role: 'SUPER_ADMIN',
            status: 'ACTIVE'
        },
        create: {
            username: 'superadmin',
            password: password,
            role: 'SUPER_ADMIN',
            fullName: 'System Super Admin',
            status: 'ACTIVE',
            firstLogin: false
        }
    });

    console.log('------------------------------------------------');
    console.log('✅ SUPER ADMIN FIXED/CREATED');
    console.log('Username: superadmin');
    console.log('Password: password123');
    console.log('Role:     SUPER_ADMIN');
    console.log('------------------------------------------------');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
