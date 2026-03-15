const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const dayjs = require('dayjs');

async function main() {
    try {
        const userId = 7; // Pasindu's UserID
        console.log(`[Simulation] getParentStats for UserID: ${userId}`);

        const parent = await prisma.parent.findFirst({
            where: { userId: userId },
            include: {
                student_student_parentIdToparent: {
                    include: {
                        classroom: {
                            include: {
                                teacherprofiles: {
                                    where: { designation: 'LEAD' },
                                    include: { user: true }
                                }
                            }
                        }
                    }
                },
                student_student_secondParentIdToparent: {
                    include: {
                        classroom: {
                            include: {
                                teacherprofiles: {
                                    where: { designation: 'LEAD' },
                                    include: { user: true }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!parent) {
            console.log('Parent not found');
            return;
        }

        console.log(`Parent: ${parent.fullName}`);

        const children = [
            ...(parent.student_student_parentIdToparent || []),
            ...(parent.student_student_secondParentIdToparent || [])
        ].filter(s => s.status === 'ACTIVE');

        console.log(`Total Active Children Found: ${children.length}`);
        children.forEach(c => {
            console.log(` - ${c.fullName} (ID: ${c.id})`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
