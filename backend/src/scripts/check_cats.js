const prisma = require('../config/prisma');

async function check() {
    try {
        const categories = await prisma.billingCategory.findMany({
            include: { classrooms: { select: { id: true, name: true } } }
        });
        console.log('CATEGORIES_JSON_START');
        console.log(JSON.stringify(categories, null, 2));
        console.log('CATEGORIES_JSON_END');

        const parent = await prisma.parent.findFirst({
            include: {
                student_student_parentIdToparent: { include: { classroom: true } }
            }
        });

        console.log('PARENT_JSON_START');
        if (parent) {
            const simpleParent = {
                id: parent.id,
                fullName: parent.fullName,
                students: parent.student_student_parentIdToparent.map(s => ({
                    id: s.id,
                    fullName: s.fullName,
                    classroomId: s.classroomId,
                    classroomName: s.classroom?.name
                }))
            };
            console.log(JSON.stringify(simpleParent, null, 2));
        } else {
            console.log("No parent found");
        }
        console.log('PARENT_JSON_END');

    } catch (e) { console.error(e); }
    finally { await prisma.$disconnect(); }
}

check();
