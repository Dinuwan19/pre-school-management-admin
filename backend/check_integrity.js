const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkIntegrity() {
    console.log('--- Database Integrity Scan ---');
    try {
        // 1. Students without Classroom
        const orphans = await prisma.student.findMany({
            where: { classroomId: null }
        });
        console.log(`- Students without Classroom: ${orphans.length}`);

        // 2. Students with invalid classroomId (Orphans)
        const students = await prisma.student.findMany({ include: { classroom: true } });
        const invalidClassroom = students.filter(s => s.classroomId && !s.classroom);
        console.log(`- Students with Invalid Classroom ID: ${invalidClassroom.length}`);

        // 3. Teachers without Users
        const teacherProfiles = await prisma.teacherprofile.findMany({ include: { user: true } });
        const invalidTeachers = teacherProfiles.filter(t => !t.user);
        console.log(`- TeacherProfiles without User: ${invalidTeachers.length}`);

        // 4. Parents without Students
        const parents = await prisma.parent.findMany({
            include: {
                student_student_parentIdToparent: true,
                student_student_secondParentIdToparent: true
            }
        });
        const childless = parents.filter(p =>
            p.student_student_parentIdToparent.length === 0 &&
            p.student_student_secondParentIdToparent.length === 0
        );
        console.log(`- Parents without Children: ${childless.length}`);

        // 5. Check for null studentUniqueId
        const missingSid = await prisma.student.findMany({
            where: { studentUniqueId: null }
        });
        console.log(`- Students missing StudentID: ${missingSid.length}`);

    } catch (e) {
        console.error('Scan Failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

checkIntegrity();
