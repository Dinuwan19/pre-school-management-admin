const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const fs = require('fs');

async function check() {
    let output = '';
    const users = await prisma.user.findMany({
        include: { teacherProfile: true }
    });
    output += '--- Users and Profiles ---\n';
    users.forEach(u => {
        output += `User: ${u.username} (ID: ${u.id}, Role: ${u.role})\n`;
        if (u.teacherProfile) {
            output += `  Profile: Assigned Class: ${u.teacherProfile.assignedClassroomId}\n`;
        } else {
            output += '  Profile: MISSING\n';
        }
    });

    const classrooms = await prisma.classroom.findMany();
    output += '\n--- Classrooms ---\n';
    classrooms.forEach(c => output += `Classroom: ${c.name} (ID: ${c.id})\n`);

    const students = await prisma.student.findMany();
    output += '\n--- Students ---\n';
    students.forEach(s => output += `Student: ${s.fullName} (ID: ${s.id}, ClassroomID: ${s.classroomId}, ParentID: ${s.parentId}, 2ndParentID: ${s.secondParentId})\n`);

    const parents = await prisma.parent.findMany();
    output += '\n--- Parents ---\n';
    parents.forEach(p => output += `Parent: ${p.fullName} (ID: ${p.id})\n`);

    fs.writeFileSync('debug_output.txt', output);
    console.log('Output written to debug_output.txt');
}

check().catch(console.error).finally(() => prisma.$disconnect());
