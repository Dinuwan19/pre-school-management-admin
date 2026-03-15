const prisma = require('../config/prisma');
const dayjs = require('dayjs');
const path = require('path');
const { uploadFile } = require('../services/storage.service');
const pdfService = require('../services/pdf.service');
const reportService = require('../services/report.service');

exports.generateReport = async (req, res, next) => {
    try {
        const { type, dateRange, studentId } = req.body;
        const generatedById = req.user.id;
        const generatorName = req.user.fullName;

        // 1. Determine Date Range
        let startDate, endDate;
        const now = dayjs();

        switch (dateRange) {
            case 'This Month':
                startDate = now.startOf('month').toDate();
                endDate = now.endOf('month').toDate();
                break;
            case 'Last Month':
                startDate = now.subtract(1, 'month').startOf('month').toDate();
                endDate = now.subtract(1, 'month').endOf('month').toDate();
                break;
            case 'Year to Date':
                startDate = now.startOf('year').toDate();
                endDate = now.toDate();
                break;
            default:
                startDate = now.startOf('month').toDate();
                endDate = now.toDate();
        }

        let reportData;

        // 2. Logic Selection (Service Layer)
        if (type === 'Fee Payment Report' || type === 'Financial Report') {
            reportData = await reportService.getFinancialReportData(startDate, endDate, generatorName);
        } else if (type === 'Attendance Report') {
            // TODO: Move Attendance Report to reportService later
            // Keeping original logic for now to ensure continuity
            const globalStats = await prisma.attendance.groupBy({
                by: ['status'],
                where: { attendanceDate: { gte: startDate, lte: endDate } },
                _count: { _all: true }
            });

            let gPresent = 0, gAbsent = 0, gLate = 0;
            globalStats.forEach(s => {
                if (['PRESENT', 'COMPLETED'].includes(s.status)) gPresent += s._count._all;
                if (['ABSENT'].includes(s.status)) gAbsent += s._count._all;
                if (['LATE'].includes(s.status)) gLate += s._count._all;
            });
            const gTotal = gPresent + gAbsent + gLate;
            const gRate = gTotal > 0 ? Math.round((gPresent / gTotal) * 100) : 0;

            reportData = {
                generatedBy: generatorName,
                pages: [{
                    title: 'Institutional Attendance Overview',
                    sidebarMetrics: {
                        'Overview': { 'Attendance Rate': `${gRate}%`, 'Total Records': gTotal },
                        'Breakdown': { 'Present': gPresent, 'Absent': gAbsent, 'Late': gLate }
                    },
                    insight: `The institution maintained an average attendance rate of ${gRate}% for this period.`,
                    charts: [{
                        id: 'global-trend',
                        config: JSON.stringify({
                            type: 'doughnut',
                            data: {
                                labels: ['Present', 'Absent', 'Late'],
                                datasets: [{ data: [gPresent, gAbsent, gLate], backgroundColor: ['#00B894', '#FF7675', '#FDCB6E'], borderWidth: 0 }]
                            },
                            options: { maintainAspectRatio: false, cutout: '70%' }
                        })
                    }],
                    tables: []
                }]
            };
        } else if (type === 'Student Progress Report') {
            // Keeping original logic for now
            if (studentId) {
                const student = await prisma.student.findUnique({ where: { id: parseInt(studentId) } });
                const assessment = await prisma.assessment.findFirst({
                    where: { studentId: parseInt(studentId) },
                    orderBy: { updatedAt: 'desc' },
                    include: { scores: { include: { subSkill: true } } }
                });

                if (assessment) {
                    const scoresList = assessment.scores.map(s => s.score);
                    const avg = scoresList.reduce((a, b) => a + b, 0) / scoresList.length;
                    reportData = {
                        generatedBy: generatorName,
                        pages: [{
                            title: `Development Profile: ${student.fullName}`,
                            sidebarMetrics: { 'Profile': { 'Growth Index': `${avg.toFixed(1)}/5.0`, 'Skills': scoresList.length } },
                            insight: `${student.fullName} demonstrates a Growth Index of ${avg.toFixed(1)}.`,
                            charts: [{
                                id: 'radar-skill',
                                config: JSON.stringify({
                                    type: 'radar',
                                    data: {
                                        labels: assessment.scores.map(s => s.subSkill.name),
                                        datasets: [{ data: scoresList, backgroundColor: 'rgba(123, 87, 228, 0.2)', borderColor: '#7B57E4' }]
                                    },
                                    options: { scales: { r: { min: 0, max: 5 } }, maintainAspectRatio: false }
                                })
                            }],
                            tables: []
                        }]
                    };
                }
            }
        }

        if (!reportData) {
            return res.status(400).json({ message: 'Could not generate report data for the selected type' });
        }

        // 3. Generate HTML and PDF
        const html = pdfService.generateReportTemplate(type, reportData);
        const pdfBuffer = await pdfService.generatePdfFromHtml(html);

        // 4. Upload and Log
        const fileName = `${type.replace(/\s/g, '_')}_${dayjs().format('YYYYMMDD_HHmm')}.pdf`;
        const fileObj = { originalname: fileName, mimetype: 'application/pdf', buffer: pdfBuffer, fieldname: 'report' };

        const publicUrl = await uploadFile(fileObj, 'reports');

        const log = await prisma.report_log.create({
            data: {
                reportType: type,
                dateRange: dateRange,
                generatedById: generatedById,
                filePath: publicUrl
            }
        });

        res.json({ message: 'Advanced analytical report generated successfully', reportId: log.id, downloadUrl: publicUrl });
    } catch (error) {
        console.error('Report Generation Error:', error);
        next(error);
    }
};

exports.getRecentReports = async (req, res, next) => {
    try {
        const reports = await prisma.report_log.findMany({
            orderBy: { createdAt: 'desc' },
            take: 15,
            include: { user: { select: { fullName: true } } }
        });
        res.json(reports);
    } catch (error) {
        next(error);
    }
};

exports.downloadReport = async (req, res, next) => {
    try {
        const { id } = req.params;
        const report = await prisma.report_log.findUnique({ where: { id: parseInt(id) } });

        if (!report) return res.status(404).json({ message: 'Report not found' });

        res.json({
            downloadUrl: report.filePath,
            fileName: path.basename(report.filePath || 'report.pdf')
        });
    } catch (error) {
        next(error);
    }
};
