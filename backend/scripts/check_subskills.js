const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const count = await prisma.sub_skill.count();
        console.log('SubSkills count:', count);
        if(count > 0) {
            const sample = await prisma.sub_skill.findFirst();
            console.log('Sample:', sample);
        }
    } catch(e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
