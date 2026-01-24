const prisma = require('./config/prisma');
const bcrypt = require('bcryptjs');

async function seedRoles() {
    const password = await bcrypt.hash('password123', 10);

    const users = [
        { username: 'superadmin', role: 'SUPER_ADMIN', email: 'super@school.com' },
        { username: 'admin', role: 'ADMIN', email: 'admin@school.com' },
        { username: 'teacher', role: 'TEACHER', email: 'teacher@school.com' }
    ];

    for (const u of users) {
        const upsertUser = await prisma.user.upsert({
            where: { username: u.username },
            update: {
                role: u.role,
                password: password,
                firstLogin: false, // Skip force-change for testing
                email: u.email
            },
            create: {
                username: u.username,
                password: password,
                role: u.role,
                fullName: u.username.toUpperCase(),
                firstLogin: false,
                email: u.email
            }
        });
        console.log(`Synced user: ${u.username} as ${u.role}`);
    }
}

seedRoles()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
