const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Seeding sample assessment data...');

    const student = await prisma.student.findFirst({ where: { status: 'ACTIVE' } });
    const user = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });

    if (!student || !user) {
        console.error('Missing student or user. Please ensure they exist first.');
        return;
    }

    const categories = await prisma.skill_category.findMany({
        include: { skills: true }
    });

    if (categories.length === 0) {
        console.error('No categories found. Run seed-skill-metadata.js first.');
        return;
    }

    // Delete existing assessment for this student/term if any
    await prisma.assessment.deleteMany({
        where: { studentId: student.id, term: 1 }
    });

    const assessment = await prisma.assessment.create({
        data: {
            studentId: student.id,
            term: 1,
            remarks: 'Child is showing great progress across all developmental areas! Vibrant energy and curious mind.',
            updatedById: user.id
        }
    });

    console.log(`Created assessment ID: ${assessment.id} for ${student.fullName}`);

    for (const cat of categories) {
        console.log(`Seeding scores for: ${cat.name}`);
        for (const skill of cat.skills) {
            // Assign varying scores to show different colors if threshold-based,
            // or just consistent performance to show the "Fancy Colors" of the bars.
            // Scores: 1 (Needs Support), 2 (Approaching), 3 (Achieved)
            let score = 3;
            if (Math.random() > 0.8) score = 2;
            if (Math.random() > 0.95) score = 1;

            await prisma.assessment_score.create({
                data: {
                    assessmentId: assessment.id,
                    subSkillId: skill.id,
                    score: score
                }
            });
        }
    }

    console.log('Successfully seeded sample assessments!');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
