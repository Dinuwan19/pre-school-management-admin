const prisma = require('../config/prisma');
const dayjs = require('dayjs');
const fs = require('fs');
const path = require('path');
// Note: In a real production app, use 'pdfkit' or similar to generate actual PDFs.
// For this prototype, we'll confirm data fetching and mock the file path/download.

exports.generateReport = async (req, res, next) => {
    try {
        const { type, dateRange } = req.body;
        const generatedById = req.user.id;

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
            default: // Custom or Year to Date
                startDate = now.startOf('year').toDate();
                endDate = now.toDate();
        }

        // 2. Fetch Data (Proof of Concept Logic)
        let reportData = {};

        if (type === 'Attendance Report') {
            const attendance = await prisma.attendance.count({
                where: { attendanceDate: { gte: startDate, lte: endDate } }
            });
            reportData = { totalRecords: attendance };
        } else if (type === 'Classroom Report') {
            const classrooms = await prisma.classroom.count({ where: { status: 'ACTIVE' } });
            reportData = { activeClassrooms: classrooms };
        } else if (type === 'Financial Report') {
            const income = await prisma.payment.aggregate({
                _sum: { amountPaid: true },
                where: { createdAt: { gte: startDate, lte: endDate }, status: 'APPROVED' }
            });
            reportData = { totalIncome: income._sum.amountPaid || 0 };
        }

        // 3. Log the Report
        const mockFileName = `${type.replace(/\s/g, '_')}_${dayjs().format('YYYYMMDD_HHmm')}.pdf`;

        const log = await prisma.report_log.create({
            data: {
                reportType: type,
                dateRange: dateRange,
                generatedById: generatedById,
                filePath: `/reports/${mockFileName}`
            }
        });

        res.json({
            message: 'Report generated successfully',
            reportId: log.id,
            details: reportData
        });

    } catch (error) {
        next(error);
    }
};

exports.getRecentReports = async (req, res, next) => {
    try {
        const reports = await prisma.report_log.findMany({
            orderBy: { createdAt: 'desc' },
            take: 10,
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

        // In a real app, stream the file. 
        // Here we just return the metadata to simulate 'download' action in frontend.
        res.json({
            downloadUrl: report.filePath,
            fileName: path.basename(report.filePath || 'report.pdf')
        });
    } catch (error) {
        next(error);
    }
};
