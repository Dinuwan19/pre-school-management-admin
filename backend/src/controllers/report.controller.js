const prisma = require('../config/prisma');
const dayjs = require('dayjs');
const path = require('path');
const { uploadFile } = require('../services/storage.service');
const pdfService = require('../services/pdf.service');
const reportService = require('../services/report.service');

exports.generateReport = async (req, res, next) => {
    try {
        const { type, dateRange, studentId } = req.body;
        const generatorName = req.user?.fullName || 'Authorized Administrator';

        console.log(`[Report] Starting generation for ${type} by ${generatorName}`);

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
                // Start with current academic year (January) as per user request
                startDate = now.startOf('year').toDate();
                endDate = now.toDate();
        }

        let reportData;
        let html;

        // 2. Specialized Logic Selection
        if (type === 'Attendance Report' || type === 'Attendance Summary') {
            reportData = await reportService.getAttendanceSummaryData(startDate, endDate, generatorName);
            html = pdfService.generateAttendanceSummaryTemplate(reportData);
        } else if (type === 'Student Progress Report') {
            if (!studentId) {
                return res.status(400).json({ message: 'Student selection is required for Progress Reports' });
            }
            reportData = await reportService.getStudentProgressReportData(studentId, generatorName);
            html = pdfService.generateStudentProgressTemplate(reportData);
        }

        console.log(`[Report] Generated data for ${type}:`, reportData ? 'SUCCESS' : 'NULL');

        if (!reportData || !html) {
            return res.status(400).json({ message: 'Failed to aggregate data for the selected report type' });
        }

        // 3. Generate PDF
        const pdfBuffer = await pdfService.generatePdfFromHtml(html);

        // 4. Upload and Log
        const fileName = `${type.replace(/\s/g, '_')}_${dayjs().format('YYYYMMDD_HHmm')}.pdf`;
        const fileObj = { originalname: fileName, mimetype: 'application/pdf', buffer: pdfBuffer, fieldname: 'report' };

        const publicUrl = await uploadFile(fileObj, 'reports');

        const log = await prisma.report_log.create({
            data: {
                reportType: type,
                dateRange: dateRange,
                generatedById: req.user.id,
                filePath: publicUrl
            }
        });

        res.json({ message: 'Specialized analytical report generated successfully', reportId: log.id, downloadUrl: publicUrl });
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

exports.deleteReport = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        // 1. Find the report
        const report = await prisma.report_log.findUnique({
            where: { id: parseInt(id) }
        });

        if (!report) {
            return res.status(404).json({ message: 'Report not found' });
        }

        // 2. Delete physical file if exists
        const storageService = require('../services/storage.service');
        if (report.filePath) {
            await storageService.deleteFile(report.filePath);
        }

        // 3. Delete DB record
        await prisma.report_log.delete({
            where: { id: parseInt(id) }
        });

        res.json({ message: 'Report and file deleted successfully' });
    } catch (error) {
        console.error('Delete Report Error:', error);
        next(error);
    }
};
