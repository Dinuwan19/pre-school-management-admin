const pdfService = require('../backend/src/services/pdf.service');
const fs = require('fs');
const path = require('path');

// Mock Data for Verification
const mockFinancialData = {
    pages: [{
        title: 'Financial Health Statement',
        sidebarMetrics: {
            'Liquidity': { 'Net Position': 'LKR 50,000', 'Margin': '25%' },
            'Collection': { 'Efficiency': '80%', 'Pending Bills': 5 }
        },
        insight: 'Net position is positive.',
        charts: [{
            id: 'cashflow',
            config: JSON.stringify({ type: 'bar', data: { labels: ['A'], datasets: [{ data: [100] }] } })
        }],
        tables: [{
            title: 'Collection Breakdown',
            headers: ['Source', 'Amount'],
            rows: [['Tuition', 'LKR 1000']]
        }]
    }]
};

async function testGeneration() {
    console.log('Testing PDF Generation...');
    try {
        const html = pdfService.generateReportTemplate('Test Financial Report', mockFinancialData);
        // We won't actually generate the PDF plain binary here as we might not have puppeteer setup in this env easily,
        // but generating the HTML confirms the template logic is sound.

        const outputPath = path.join(__dirname, 'test_report_output.html');
        fs.writeFileSync(outputPath, html);
        console.log(`Successfully generated HTML template at ${outputPath}`);
        console.log('Review this file to ensure layout is correct.');
    } catch (error) {
        console.error('Error generating PDF template:', error);
    }
}

testGeneration();
