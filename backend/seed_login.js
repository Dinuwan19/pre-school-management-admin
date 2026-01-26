const prisma = require('./src/config/prisma');
const bcrypt = require('bcryptjs');

async function seedLogin() {
    try {
        console.log('Creating Hardcoded Login...');

        // 1. Create/Find Parent Record
        const parent = await prisma.parent.upsert({
            where: { nationalId: '991234567V' },
            components: {},
            update: {},
            create: {
                parentUniqueId: 'P-TEST-001',
                fullName: 'Test Parent User',
                relationship: 'FATHER',
                nationalId: '991234567V',
                phone: '0771234567',
                email: 'parent@test.com',
                address: '123 Test Street, Colombo',
                status: 'ACTIVE'
            }
        });

        // 2. Create User Account (username: parent, pass: 123)
        const hashedPassword = await bcrypt.hash('123', 10);

        const user = await prisma.user.upsert({
            where: { username: 'parent' },
            components: {},
            update: {
                role: 'PARENT',
                status: 'ACTIVE'
            },
            create: {
                username: 'parent',
                password: hashedPassword,
                role: 'PARENT',
                fullName: parent.fullName,
                email: parent.email,
                phone: parent.phone,
                status: 'ACTIVE',
                firstLogin: false
            }
        });

        // 3. Link them
        await prisma.parent.update({
            where: { id: parent.id },
            data: { userId: user.id }
        });

        console.log('✅ LOGIN CREATED SUCCESSFULY!');
        console.log('-----------------------------');
        console.log('Username: parent');
        console.log('Password: 123');
        console.log('-----------------------------');
        console.log('You can now go to "Login" screen directly.');

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

seedLogin();
