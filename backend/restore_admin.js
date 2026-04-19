const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function restore() {
    console.log('🚀 Starting Admin Account Restoration...');
    try {
        const username = 'superadmin_user';
        const password = 'Admin@1234'; // Temporary password
        const hashedPassword = await bcrypt.hash(password, 10);

        console.log(`🔍 Checking if user "${username}" exists...`);
        const existingUser = await prisma.user.findUnique({
            where: { username }
        });

        if (existingUser) {
            console.log(`⚠️ User "${username}" already exists. Resetting password...`);
            await prisma.user.update({
                where: { id: existingUser.id },
                data: { 
                    password: hashedPassword,
                    status: 'ACTIVE',
                    isActive: true,
                    role: 'SUPER_ADMIN'
                }
            });
            console.log('✅ Password reset to: Admin@1234');
        } else {
            console.log(`✨ Creating new SUPER_ADMIN: ${username}...`);
            await prisma.user.create({
                data: {
                    username,
                    password: hashedPassword,
                    fullName: 'Super Administrator',
                    role: 'SUPER_ADMIN',
                    status: 'ACTIVE',
                    isActive: true,
                    firstLogin: false
                }
            });
            console.log('✅ Account created successfully!');
            console.log('Credentials:');
            console.log(`Username: ${username}`);
            console.log(`Password: ${password}`);
        }

        console.log('\n--- SUCCESS ---');
        console.log('You can now log in to the system.');
    } catch (error) {
        console.error('❌ Error during restoration:', error);
        if (error.code === 'P2021') {
            console.error('\nTIP: The "user" table does not exist. Please run: npx prisma db push --accept-data-loss');
        }
    } finally {
        await prisma.$disconnect();
    }
}

restore();
