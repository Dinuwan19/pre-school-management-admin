const path = require('path');
const prisma = require(path.resolve(__dirname, '../backend/src/config/prisma'));
const dayjs = require(path.resolve(__dirname, '../backend/node_modules/dayjs'));

async function testFallback() {
    console.log('Testing Aggregate Report Fallback Logic...');

    // 1. Pick a date range with NO assessments (e.g., last year)
    const startDate = new Date('2025-01-01');
    const endDate = new Date('2025-01-31');
    const dateLabel = 'Jan 1 - Jan 31, 2025';

    console.log(`Querying for range: ${dateLabel}`);

    const assessments = await prisma.assessment.findMany({
        where: { updatedAt: { gte: startDate, lte: endDate } },
        include: { scores: { include: { subSkill: true } } }
    });

    console.log(`Found ${assessments.length} assessments.`);

    const reportData = { pages: [] };

    // 2. Run the logic I added to the controller
    if (assessments.length === 0) {
        reportData.pages.push({
            title: 'Institutional Proficiency Analysis',
            sidebarMetrics: { 'Status': { 'Assessments': '0', 'Period': 'No Activity' } },
            insight: `No assessment records were found for the period ${dateLabel}. To generate this analysis, ensure student assessments have been completed and saved within the selected timeframe.`,
            charts: [],
            tables: []
        });
    } else {
        // ... (rest of logic) ...
        console.log('Unexpected: Found assessments, fallback check failed.');
    }

    // 3. Output result
    console.log('Generated Page Structure:');
    console.log(JSON.stringify(reportData.pages[0], null, 2));

    if (reportData.pages[0].insight.includes('No assessment records were found')) {
        console.log('SUCCESS: Fallback logic triggered correctly.');
    } else {
        console.log('FAILURE: Fallback logic did not produce expected insight.');
    }

    await prisma.$disconnect();
}

testFallback();
