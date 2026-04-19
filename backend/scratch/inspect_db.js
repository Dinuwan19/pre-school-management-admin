const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const cats = await prisma.billingCategory.findMany();
    console.log('--- CATEGORIES ---');
    console.log(JSON.stringify(cats, null, 2));

    const billings = await prisma.billing.findMany({
        where: { NOT: { categoryId: null } },
        include: { billingCategory: true }
    });
    console.log('\n--- BILLINGS WITH CATEGORY ---');
    billings.forEach(b => {
        console.log(`ID: ${b.id}, Student: ${b.studentId}, Cat: ${b.billingCategory?.name}, Status: ${b.status}`);
    });
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
