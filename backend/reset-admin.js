const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const username = 'admin';
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log(`Resetting password for user: ${username}`);

    try {
        const user = await prisma.user.update({
            where: { username },
            data: {
                password: hashedPassword,
                status: 'ACTIVE', // Ensure active
            },
        });
        console.log('Password reset successful.');
        console.log(`User ID: ${user.id}`);
        console.log(`New Password: ${password}`);
    } catch (error) {
        console.error('Error resetting password:', error);
        // If update fails, maybe user doesn't exist? Try create?
        // But seed said it exists.
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
