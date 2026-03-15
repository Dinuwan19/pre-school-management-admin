const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('--- Finding Parent "Pasindu" ---');
        // Search by username or fullName
        const parents = await prisma.parent.findMany({
            where: {
                OR: [
                    { fullName: { contains: 'pasindu' } },
                    { user: { username: { contains: 'pasindu' } } }
                ]
            },
            include: {
                user: true,
                student_student_parentIdToparent: true
            }
        });

        if (parents.length === 0) {
            console.log('No parent found matching "pasindu"');
            return;
        }

        for (const p of parents) {
            console.log(`\nParent: ${p.fullName} (ID: ${p.id}, UserID: ${p.userId})`);
            console.log(`Username: ${p.user?.username}`);
            console.log(`Linked Students Count: ${p.student_student_parentIdToparent.length}`);

            p.student_student_parentIdToparent.forEach(s => {
                console.log(`  - Student: ${s.fullName} (ID: ${s.id}) [Status: ${s.status}]`);
            });
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
