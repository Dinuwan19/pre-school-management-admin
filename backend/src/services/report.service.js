const prisma = require('../config/prisma');
const dayjs = require('dayjs');

/**
 * Service to handle complex data aggregation for reports
 */

exports.getStudentProgressReportData = async (studentId, generatorName) => {
    // 1. Fetch Student & Classroom Info
    const student = await prisma.student.findUnique({
        where: { id: parseInt(studentId) },
        include: { classroom: true }
    });

    if (!student) throw new Error('Student not found');

    // 2. Fetch All Skill Categories and Sub-skills
    const categories = await prisma.skill_category.findMany({
        include: { skills: true },
        orderBy: { name: 'asc' }
    });

    // 3. Fetch All Assessments for the student (Term 1, 2, 3)
    const assessments = await prisma.assessment.findMany({
        where: { studentId: parseInt(studentId) },
        include: { scores: { include: { subSkill: true } } },
        orderBy: { term: 'asc' }
    });

    // Data Mapping for Table Representation
    // Structure: Category -> [SubSkill -> {term1: score, term2: score, term3: score}]
    const mappedData = categories.map(cat => {
        const skillsWithScores = cat.skills.map(subSkill => {
            const scores = {};
            [1, 2, 3].forEach(term => {
                const assessment = assessments.find(a => a.term === term);
                const scoreObj = assessment?.scores.find(s => s.subSkillId === subSkill.id);
                scores[`term${term}`] = scoreObj ? scoreObj.score : '-';
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

    // Latest Remarks (PRIORITY: Term 3 -> 2 -> 1)
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
    const start = dayjs(startDate || dayjs().startOf('year'));
    const end = dayjs(endDate || dayjs());
    const diffMonths = end.diff(start, 'month');
    const isOver12Months = diffMonths > 12;

    // 1. Fetch All Classrooms
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

    // 2. Identify Students with < 50% Attendance
    const studentsWithLowAttendance = [];
    
    // 3. Prepare Chart Data (Monthly or Bi-monthly)
    const chartLabels = [];
    const classroomDatasets = classrooms.map(cls => ({
        label: cls.name,
        data: []
    }));

    // Time Iteration
    const step = isOver12Months ? 2 : 1;
    let current = start.startOf('month');
    
    while (current.isBefore(end) || current.isSame(end, 'month')) {
        const periodStart = current.toDate();
        const periodEnd = isOver12Months ? current.add(1, 'month').endOf('month').toDate() : current.endOf('month').toDate();
        
        const label = isOver12Months 
            ? `${current.format('MMM')}-${current.add(1, 'month').format('MMM')}`
            : current.format('MMMM');
        
        chartLabels.push(label);

        classrooms.forEach((cls, idx) => {
            let totalClassAttendance = 0;
            let totalPossibleRecords = 0;

            cls.student.forEach(std => {
                // Filter student attendance for this specific period
                const periodAttendance = std.attendance.filter(a => 
                    dayjs(a.attendanceDate).isAfter(dayjs(periodStart).subtract(1, 'day')) && 
                    dayjs(a.attendanceDate).isBefore(dayjs(periodEnd).add(1, 'day'))
                );

                const presentCount = periodAttendance.filter(a => ['PRESENT', 'LATE', 'COMPLETED'].includes(a.status)).length;
                totalClassAttendance += presentCount;
                
                // Estimation: Only count days where at least one student in class had a record (active school days)
                // For simplicity, we assume period attendance length / unique students count as indicator of days
                totalPossibleRecords += periodAttendance.length;

                // Overall Logic for < 50% (For the table)
                if (current.isSame(start.startOf('month'))) { // Only run once for the whole range
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

            const avgAttendance = totalPossibleRecords > 0 ? Math.round((totalClassAttendance / totalPossibleRecords) * 100) : 0;
            classroomDatasets[idx].data.push(avgAttendance);
        });

        current = current.add(step, 'month');
    }

    // Colors for the chart (Premium Palette)
    const professionalColors = [
        '#7B57E4', '#55E6C1', '#FF7675', '#FDCB6E', '#A29BFE', '#55E6C1', '#00B894', '#6C5CE7'
    ];

    return {
        generatedBy: generatorName,
        timeframe: `${start.format('MMMM YYYY')} - ${end.format('MMMM YYYY')}`,
        chartData: {
            labels: chartLabels,
            datasets: classroomDatasets.map((ds, i) => ({
                ...ds,
                backgroundColor: professionalColors[i % professionalColors.length],
                borderRadius: 4
            }))
        },
        lowAttendanceStudents: studentsWithLowAttendance,
        classCount: classrooms.length,
        studentCount: classrooms.reduce((sum, cls) => sum + cls.student.length, 0)
    };
};

