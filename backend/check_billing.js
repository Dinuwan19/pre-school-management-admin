const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const categories = await prisma.billingCategory.findMany();
    console.log('Categories:', JSON.stringify(categories, null, 2));
    
    const billsWithCategories = await prisma.billing.findMany({
        where: { categoryId: { not: null } },
        include: { billingCategory: true }
    });
    console.log('Bills with Categories:', JSON.stringify(billsWithCategories, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
