const prisma = require('../config/prisma');

exports.getCategories = async (req, res, next) => {
    try {
        const categories = await prisma.skill_category.findMany({
            include: { skills: true },
            orderBy: { name: 'asc' }
        });
        res.json(categories);
    } catch (error) {
        next(error);
    }
};

exports.getStudentsForSubSkill = async (req, res, next) => {
    try {
        const { subSkillId } = req.params;
        const { term, classroomId } = req.query;

        let where = { status: 'ACTIVE' };
        if (classroomId) {
            where.classroomId = parseInt(classroomId);
        } else if (req.classroomScope) {
            where.classroomId = { in: req.classroomScope };
        }

        const students = await prisma.student.findMany({
            where,
            include: {
                assessments: {
                    where: { term: parseInt(term) || 1 },
                    include: {
                        scores: {
                            where: { subSkillId: parseInt(subSkillId) }
                        }
                    }
                }
            },
            orderBy: { fullName: 'asc' }
        });

        const formatted = students.map(s => {
            const scoreObj = s.assessments[0]?.scores[0];
            return {
                id: s.id,
                fullName: s.fullName,
                studentUniqueId: s.studentUniqueId,
                currentScore: scoreObj ? scoreObj.score : null,
                assessmentId: s.assessments[0]?.id || null
            };
        });

        res.json(formatted);
    } catch (error) {
        next(error);
    }
};

exports.bulkUpdateScores = async (req, res, next) => {
    try {
        const { subSkillId, term, updates } = req.body; // updates: [{ studentId, score }]
        const updatedById = req.user.id;

        const results = await prisma.$transaction(async (tx) => {
            const out = [];
            for (const update of updates) {
                // 1. Find or Create assessment for this student/term
                let assessment = await tx.assessment.findFirst({
                    where: { studentId: update.studentId, term: parseInt(term) }
                });

                if (!assessment) {
                    assessment = await tx.assessment.create({
                        data: {
                            studentId: update.studentId,
                            term: parseInt(term),
                            updatedById
                        }
                    });
                }

                // 2. Upsert score
                const existingScore = await tx.assessment_score.findFirst({
                    where: { assessmentId: assessment.id, subSkillId: parseInt(subSkillId) }
                });

                if (existingScore) {
                    await tx.assessment_score.update({
                        where: { id: existingScore.id },
                        data: { score: update.score }
                    });
                } else {
                    await tx.assessment_score.create({
                        data: {
                            assessmentId: assessment.id,
                            subSkillId: parseInt(subSkillId),
                            score: update.score
                        }
                    });
                }

                // 3. Update assessment timestamp
                await tx.assessment.update({
                    where: { id: assessment.id },
                    data: { updatedById, updatedAt: new Date() }
                });

                out.push({ studentId: update.studentId, score: update.score });
            }
            return out;
        });

        res.json({ message: `Successfully updated scores for ${results.length} students`, results });
    } catch (error) {
        next(error);
    }
};
