const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
    try {
        const cats = [
            'Language Development Skills', 
            'Logical & Mathematical Skills', 
            'Physical Development Skills', 
            'Aesthetic & Creative Skills', 
            'Living & Non-Living World', 
            'Healthy Living Habits', 
            'Cultural Heritage & Values'
        ];
        for (const name of cats) {
            const existing = await prisma.skill_category.findFirst({ where: { name } });
            if (!existing) {
                await prisma.skill_category.create({ data: { name } });
                console.log(`Created: ${name}`);
            } else {
                console.log(`Exists: ${name}`);
            }
        }
    } catch(e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

seed();
