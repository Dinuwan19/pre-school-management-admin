const prisma = require('../config/prisma');
const dayjs = require('dayjs');
const isSameOrAfter = require('dayjs/plugin/isSameOrAfter');
const isSameOrBefore = require('dayjs/plugin/isSameOrBefore');
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

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
    // 1. Handle Aggregate View (if no studentId)
    if (!studentId) {
        const categories = await prisma.skill_category.findMany({
            include: { skills: { include: { assessment_score: true } } },
            orderBy: { name: 'asc' }
        });

        const mappedData = categories.map(cat => {
            const skillsWithAvg = cat.skills.map(skill => {
                const scores = skill.assessment_score.map(s => s.score);
                const avg = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
                
                return {
                    id: skill.id,
                    name: skill.name,
                    term1: avg > 0 ? scoreToLabel(Math.round(avg)) : '-',
                    term2: '-', // Aggregate view is single-snapshot
                    term3: '-'
                };
            });
            return { id: cat.id, name: cat.name, skills: skillsWithAvg };
        });

        return {
            student: { fullName: 'ALL STUDENTS (AGGREGATE)', studentUniqueId: 'N/A', classroomName: 'Institutional Wide', enrolledDate: 'N/A', age: 'N/A' },
            generatedBy: generatorName,
            categories: mappedData,
            teacherComment: 'This report represents the mean proficiency levels across all assessed students.'
        };
    }

    // 2. Individual View
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
                scores[`term${term}`] = scoreObj ? scoreToLabel(scoreObj.score) : '-';
            });
            return { id: subSkill.id, name: subSkill.name, ...scores };
        });
        return { id: cat.id, name: cat.name, skills: skillsWithScores };
    });

    const latestAssessment = [...assessments].sort((a, b) => b.term - a.term)[0];
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
    const start = dayjs().startOf('year');
    const end = dayjs(endDate || dayjs()).endOf('month');
    const isOver12Months = end.diff(start, 'month') > 12;

    const classrooms = await prisma.classroom.findMany({
        where: { status: 'ACTIVE' },
        include: {
            student: {
                where: { status: 'ACTIVE' },
                include: {
                    attendance: {
                        where: { 
                            attendanceDate: { 
                                gte: start.startOf('day').toDate(), 
                                lte: end.endOf('day').toDate() 
                            } 
                        }
                    }
                }
            }
        }
    });

    const studentsWithLowAttendanceMap = new Map(); // Use Map to avoid duplicates across months
    const chartLabels = [];
    const classroomDatasets = classrooms.map(cls => ({ label: cls.name, data: [] }));

    const step = isOver12Months ? 2 : 1;
    let current = start.startOf('month');
    
    while (current.isSameOrBefore(end, 'month')) {
        const periodStart = current.startOf('month');
        const periodEnd = isOver12Months ? current.add(1, 'month').endOf('month') : current.endOf('month');
        
        const label = isOver12Months 
            ? `${current.format('MMM')}-${current.add(1, 'month').format('MMM')}`
            : current.month() < 2 ? current.format('MMMM').toLowerCase() : current.format('MMMM');
        
        chartLabels.push(label);

        classrooms.forEach((cls, idx) => {
            let totalClassPresentDays = 0;
            const studentsInClass = cls.student.length;

            cls.student.forEach(std => {
                const periodAttendance = std.attendance.filter(a => {
                    const d = dayjs(a.attendanceDate);
                    return d.isSameOrAfter(periodStart, 'day') && d.isSameOrBefore(periodEnd, 'day');
                });

                const presentCount = periodAttendance.filter(a => ['PRESENT', 'LATE', 'COMPLETED'].includes(a.status)).length;
                totalClassPresentDays += presentCount;

                // Overall Low Attendance Logic (Scan entire period)
                const totalPresentOverall = std.attendance.filter(a => ['PRESENT', 'LATE', 'COMPLETED'].includes(a.status)).length;
                const totalDaysOverall = std.attendance.length;
                const rate = totalDaysOverall > 0 ? (totalPresentOverall / totalDaysOverall) * 100 : 0;
                
                if (totalDaysOverall > 5 && rate < 60) { // Only flag if they have at least 5 records
                    studentsWithLowAttendanceMap.set(std.id, {
                        className: cls.name,
                        studentName: std.fullName,
                        studentId: std.studentUniqueId,
                        rate: Math.round(rate)
                    });
                }
            });

            const avgDaysPresent = studentsInClass > 0 ? (totalClassPresentDays / studentsInClass) : 0;
            classroomDatasets[idx].data.push(parseFloat(avgDaysPresent.toFixed(1)));
        });

        current = current.add(step, 'month');
    }

    return {
        generatedBy: generatorName,
        timeframe: `${start.format('MMMM YYYY')} - ${end.format('MMMM YYYY')}`,
        chartData: {
            labels: chartLabels,
            datasets: classroomDatasets.map((ds, i) => ({
                ...ds,
                backgroundColor: ['#FDCB6E', '#55E6C1', '#FF7675', '#7B57E4', '#A29BFE', '#00B894', '#6C5CE7'][i % 7],
                borderRadius: 2
            }))
        },
        lowAttendanceStudents: Array.from(studentsWithLowAttendanceMap.values()),
        classCount: classrooms.length,
        studentCount: classrooms.reduce((sum, cls) => sum + cls.student.length, 0)
    };
};


