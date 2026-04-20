const prisma = require('../config/prisma');
const dayjs = require('dayjs');

// Helper to map numerical scores to verbal development labels
const scoreToLabel = (score) => {
    if (!score || score === '-') return '-';
    const s = parseInt(score);
    switch (s) {
        case 1: return 'Need Help';
        case 2: return 'Approaching';
        case 3: return 'Learning';
        case 4: return 'Achieving';
        case 5: return 'Mastering';
        default: return score;
    }
};

exports.getStudentProgressReportData = async (studentId, generatorName) => {
    const student = await prisma.student.findUnique({
        where: { id: parseInt(studentId) },
        include: { classroom: true }
    });

    if (!student) throw new Error('Student not found');

    const categories = await prisma.skill_category.findMany({
        include: { skills: true },
        orderBy: { name: 'asc' }
    });

    const assessments = await prisma.assessment.findMany({
        where: { studentId: parseInt(studentId) },
        include: { scores: { include: { subSkill: true } } },
        orderBy: { term: 'asc' }
    });

    const mappedData = categories.map(cat => {
        const skillsWithScores = cat.skills.map(subSkill => {
            const scores = {};
            [1, 2, 3].forEach(term => {
                const assessment = assessments.find(a => a.term === term);
                const scoreObj = assessment?.scores.find(s => s.subSkillId === subSkill.id);
                // Map to Label
                scores[`term${term}`] = scoreObj ? scoreToLabel(scoreObj.score) : '-';
            });
            return {
                id: subSkill.id,
                name: subSkill.name,
                ...scores
            };
        });
        return {
            id: cat.id,
            name: cat.name,
            skills: skillsWithScores
        };
    });

    const latestAssessment = assessments.sort((a, b) => b.term - a.term)[0];
    const remarks = latestAssessment ? latestAssessment.remarks : 'No observations recorded for this period.';

    return {
        student: {
            fullName: student.fullName,
            studentUniqueId: student.studentUniqueId,
            classroomName: student.classroom?.name || 'N/A',
            enrolledDate: student.enrollmentDate ? dayjs(student.enrollmentDate).format('YYYY-MM-DD') : 'N/A',
            age: student.dateOfBirth ? dayjs().diff(dayjs(student.dateOfBirth), 'year') : 'N/A'
        },
        generatedBy: generatorName,
        categories: mappedData,
        teacherComment: remarks
    };
};

exports.getAttendanceSummaryData = async (startDate, endDate, generatorName) => {
    // Force start from January 1st of current year for multi-month tracking as per "Perfect achievement"
    const start = dayjs().startOf('year');
    const end = dayjs(endDate || dayjs());
    const isOver12Months = end.diff(start, 'month') > 12;

    const classrooms = await prisma.classroom.findMany({
        where: { status: 'ACTIVE' },
        include: {
            student: {
                where: { status: 'ACTIVE' },
                include: {
                    attendance: {
                        where: { attendanceDate: { gte: start.toDate(), lte: end.toDate() } }
                    }
                }
            }
        }
    });

    const studentsWithLowAttendance = [];
    const chartLabels = [];
    const classroomDatasets = classrooms.map(cls => ({
        label: cls.name,
        data: []
    }));

    const step = isOver12Months ? 2 : 1;
    let current = start.startOf('month');
    
    while (current.isBefore(end) || current.isSame(end, 'month')) {
        const periodStart = current.toDate();
        const periodEnd = isOver12Months ? current.add(1, 'month').endOf('month').toDate() : current.endOf('month').toDate();
        
        // Match user's 3rd screenshot lowercase preference for some months
        const label = isOver12Months 
            ? `${current.format('MMM')}-${current.add(1, 'month').format('MMM')}`
            : current.month() < 2 ? current.format('MMMM').toLowerCase() : current.format('MMMM');
        
        chartLabels.push(label);

        classrooms.forEach((cls, idx) => {
            let totalClassPresentDays = 0;
            const studentsInClass = cls.student.length;

            cls.student.forEach(std => {
                const periodAttendance = std.attendance.filter(a => 
                    dayjs(a.attendanceDate).isAfter(dayjs(periodStart).subtract(1, 'day')) && 
                    dayjs(a.attendanceDate).isBefore(dayjs(periodEnd).add(1, 'day'))
                );

                const presentCount = periodAttendance.filter(a => ['PRESENT', 'LATE', 'COMPLETED'].includes(a.status)).length;
                totalClassPresentDays += presentCount;

                // Overall Low Attendance Logic
                if (current.isSame(start.startOf('month'))) {
                    const totalPresentOverall = std.attendance.filter(a => ['PRESENT', 'LATE', 'COMPLETED'].includes(a.status)).length;
                    const totalDaysOverall = std.attendance.length;
                    const rate = totalDaysOverall > 0 ? (totalPresentOverall / totalDaysOverall) * 100 : 0;
                    
                    if (totalDaysOverall > 0 && rate < 50) {
                        studentsWithLowAttendance.push({
                            className: cls.name,
                            studentName: std.fullName,
                            studentId: std.studentUniqueId,
                            rate: Math.round(rate)
                        });
                    }
                }
            });

            // "Perfect" achievement metric: Average days present per student in the month
            const avgDaysPresent = studentsInClass > 0 ? (totalClassPresentDays / studentsInClass) : 0;
            classroomDatasets[idx].data.push(parseFloat(avgDaysPresent.toFixed(1)));
        });

        current = current.add(step, 'month');
    }

    const professionalColors = [
        '#FDCB6E', '#55E6C1', '#FF7675', '#7B57E4', '#A29BFE', '#00B894', '#6C5CE7'
    ];

    return {
        generatedBy: generatorName,
        timeframe: `${start.format('MMMM YYYY')} - ${end.format('MMMM YYYY')}`,
        chartData: {
            labels: chartLabels,
            datasets: classroomDatasets.map((ds, i) => ({
                ...ds,
                backgroundColor: professionalColors[i % professionalColors.length],
                borderRadius: 2
            }))
        },
        lowAttendanceStudents: studentsWithLowAttendance,
        classCount: classrooms.length,
        studentCount: classrooms.reduce((sum, cls) => sum + cls.student.length, 0)
    };
};


