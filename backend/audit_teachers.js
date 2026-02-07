const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
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

        let output = '--- Teacher & Classroom Audit ---\n';
        teachers.forEach(t => {
            output += `User: ${t.username} (ID: ${t.id})\n`;
            if (!t.teacherprofile) {
                output += '  !! NO TEACHER PROFILE FOUND !!\n';
            } else {
                const classrooms = t.teacherprofile.classrooms.map(c => `${c.name} (ID: ${c.id})`);
                output += `  Classrooms: [${classrooms.join(', ') || 'NONE'}]\n`;
            }
        });

        const students = await prisma.student.findMany({
            take: 10,
            include: { classroom: true }
        });
        output += '\n--- Sample Students ---\n';
        students.forEach(s => {
            output += `Student: ${s.fullName} (ID: ${s.id}, UID: ${s.studentUniqueId}) -> Classroom: ${s.classroom.name} (ID: ${s.classroomId})\n`;
        });

        fs.writeFileSync('teacher_audit.txt', output);
        console.log('Audit written to teacher_audit.txt');

    } catch (e) {
        console.error(e);
        fs.writeFileSync('teacher_audit.txt', 'Error: ' + e.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkTeachers();
