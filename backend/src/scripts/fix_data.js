const prisma = require('../config/prisma');

async function fixData() {
    try {
        console.log('Fixing Data...');

        // 1. Find or Create "Uniform"
        let uniformCat = await prisma.billingCategory.findFirst({
            where: { name: { contains: 'Uniform' } }
        });

        if (!uniformCat) {
            console.log('Uniform category not found. Creating it.');
            uniformCat = await prisma.billingCategory.create({
                data: {
                    name: 'School Uniform 2024',
                    reason: 'Standard School Uniform',
                    amount: 1000.00,
                    validUntil: new Date('2030-12-31')
                }
            });
        } else {
            console.log(`Found Uniform Category: ${uniformCat.name}`);
            // Update validity
            await prisma.billingCategory.update({
                where: { id: uniformCat.id },
                data: { validUntil: new Date('2030-12-31') }
            });
        }

        // 2. Link to ALL Classrooms
        const classrooms = await prisma.classroom.findMany({ where: { status: 'ACTIVE' } });
        console.log(`Linking category to ${classrooms.length} active classrooms...`);

        await prisma.billingCategory.update({
            where: { id: uniformCat.id },
            data: {
                classrooms: {
                    connect: classrooms.map(c => ({ id: c.id }))
                }
            }
        });

        console.log('SUCCESS: Category linked to all classrooms.');

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

fixData();
