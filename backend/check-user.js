const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log("Checking database for user 'admin'...");
    const user = await prisma.user.findUnique({
        where: { username: 'admin' },
    });

    if (!user) {
        console.error("❌ User 'admin' NOT FOUND in database!");
        return;
    }

    console.log("✅ User 'admin' found:", user);

    const isMatch = await bcrypt.compare('password123', user.password);
    console.log("Password check for 'password123':", isMatch ? "✅ MATCH" : "❌ DO NOT MATCH");
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
