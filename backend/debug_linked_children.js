const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const userId = 7; // Pasindu
        console.log(`[Simulation] getLinkedChildren for UserID: ${userId}`);

        const parentRecord = await prisma.parent.findUnique({
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
                        },
                        attendance: {
                            orderBy: { attendanceDate: 'desc' },
                            take: 1
                        },
                        assessments: {
                            orderBy: { updatedAt: 'desc' },
                            take: 1,
                            include: { scores: true }
                        }
                    }
                }
            }
        });

        if (!parentRecord) {
            console.log('Parent not found');
            return;
        }

        console.log(`Parent Found: ${parentRecord.fullName}`);
        console.log(`Raw Linked Students Count: ${parentRecord.student_student_parentIdToparent.length}`);

        const children = await Promise.all(parentRecord.student_student_parentIdToparent.map(async (child) => {
            console.log(`Processing child: ${child.fullName} (ID: ${child.id})`);

            // Calculate Attendance Rate (Last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const totalDays = await prisma.attendance.count({
                where: { studentId: child.id, attendanceDate: { gte: thirtyDaysAgo } }
            });
            const presentDays = await prisma.attendance.count({
                where: { studentId: child.id, attendanceDate: { gte: thirtyDaysAgo }, status: 'PRESENT' }
            });
            const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;

            // Calculate Progress Average from new assessments table
            const lastAssessment = child.assessments?.[0];
            let progressAvg = 0;
            if (lastAssessment && lastAssessment.scores && lastAssessment.scores.length > 0) {
                const totalScore = lastAssessment.scores.reduce((acc, s) => acc + s.score, 0);
                progressAvg = Math.round(totalScore / lastAssessment.scores.length);
            }

            return {
                id: child.id,
                fullName: child.fullName
            };
        }));

        console.log(`Processed Children Count: ${children.length}`);
        children.forEach(c => console.log(` - ${c.fullName}`));

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
