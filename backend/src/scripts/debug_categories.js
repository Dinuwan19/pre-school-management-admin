const prisma = require('../config/prisma');

async function debugCategories() {
    try {
        console.log('--- Debugging Billing Categories ---');

        // 1. List All Categories
        const categories = await prisma.billingCategory.findMany({
            include: { classrooms: true }
        });

        console.log(`Total Categories Found: ${categories.length}`);
        categories.forEach(c => {
            console.log(`[Category ID: ${c.id}] Name: "${c.name}", ValidUntil: ${c.validUntil}, Classrooms: ${c.classrooms.map(cl => `${cl.id}:${cl.name}`).join(', ')}`);
        });

        // 2. Check ValidUntil Logic
        const now = new Date();
        const activeCategories = categories.filter(c => new Date(c.validUntil) >= now);
        console.log(`\nActive Categories (ValidUntil >= Now): ${activeCategories.length}`);
        activeCategories.forEach(c => console.log(` - ${c.name}`));

        // 3. Simulate Parent "Roshini" (or generic check)
        // Find a parent to test with
        const parent = await prisma.parent.findFirst({
            include: {
                student_student_parentIdToparent: { include: { classroom: true } }
            }
        });

        if (parent) {
            console.log(`\n--- Simulating Parent Context: ${parent.fullName} (ID: ${parent.id}) ---`);
            const students = parent.student_student_parentIdToparent;
            const classroomIds = students.map(s => s.classroomId).filter(id => id);

            console.log(`Linked Student Classrooms: ${classroomIds.join(', ')}`);
            students.forEach(s => {
                console.log(` - Student: ${s.fullName}, Classroom: ${s.classroom?.name} (ID: ${s.classroomId})`);
            });

            // Check filtering logic matches controller
            const scopedCategories = await prisma.billingCategory.findMany({
                where: {
                    validUntil: { gte: now },
                    classrooms: {
                        some: { id: { in: classroomIds } }
                    }
                }
            });

            console.log(`\nCategories visible to this parent (Active + Scoped): ${scopedCategories.length}`);
            scopedCategories.forEach(c => console.log(` - Matched: ${c.name}`));
        } else {
            console.log('No parent found to simulate.');
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

debugCategories();
