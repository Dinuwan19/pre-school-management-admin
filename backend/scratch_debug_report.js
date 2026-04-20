const prisma = require('./src/config/prisma');
const reportService = require('./src/services/report.service');
const dayjs = require('dayjs');

async function test() {
    try {
        console.log('Testing Attendance Summary Data Aggregation...');
        const data = await reportService.getAttendanceSummaryData(null, null, 'Debug User');
        console.log('SUCCESS: Data fetched');
        console.log('Timeframe:', data.timeframe);
        console.log('Datasets:', data.chartData.datasets.length);
        console.log('First Dataset Sample:', JSON.stringify(data.chartData.datasets[0], null, 2));
    } catch (error) {
        console.error('CRITICAL ERROR in aggregation:', error);
    } finally {
        await prisma.$disconnect();
    }
}

test();
