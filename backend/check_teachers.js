const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTeachers() {
    try {
        const teachers = await prisma.user.findMany({
            where: { role: 'TEACHER' },
            include: {
                teacherprofile: {
                    include: { classrooms: true }
                }
            }
        });

        console.log('--- Teacher & Classroom Audit ---');
        teachers.forEach(t => {
            console.log(`User: ${t.username} (ID: ${t.id})`);
            if (!t.teacherprofile) {
                console.log('  !! NO TEACHER PROFILE FOUND !!');
            } else {
                const classrooms = t.teacherprofile.classrooms.map(c => c.name);
                console.log(`  Classrooms: [${classrooms.join(', ') || 'NONE'}]`);
            }
        });

        const students = await prisma.student.findMany({
            take: 5,
            include: { classroom: true }
        });
        console.log('\n--- Sample Students ---');
        students.forEach(s => {
            console.log(`Student: ${s.fullName} (ID: ${s.id}) -> Classroom: ${s.classroom.name} (ID: ${s.classroomId})`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkTeachers();
