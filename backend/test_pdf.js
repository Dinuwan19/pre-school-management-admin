const pdfService = require('./src/services/pdf.service');
const fs = require('fs');
const path = require('path');

async function testPdf() {
    console.log('Testing PDF Generation...');
    const title = 'Test Financial Report';
    const data = {
        summary: {
            'Total Income': 'LKR 50,000',
            'Total Expenses': 'LKR 20,000',
            'Net Balance': 'LKR 30,000'
        },
        tableHeaders: ['Category', 'Type', 'Amount', 'Date'],
        tableData: [
            ['Tuition', 'Income', 'LKR 50,000', '2026-02-19'],
            ['Rent', 'Expense', 'LKR 20,000', '2026-02-19']
        ]
    };

    const chartConfig = JSON.stringify({
        type: 'bar',
        data: {
            labels: ['Income', 'Expenses', 'Net Balance'],
            datasets: [{
                label: 'Financial Comparison (LKR)',
                data: [50000, 20000, 30000],
                backgroundColor: ['#7B57E4', '#dc3545', '#28a745'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } }
        }
    });

    try {
        const html = pdfService.generateReportTemplate(title, data, chartConfig);
        console.log('HTML generated. Now generating PDF...');
        const pdfBuffer = await pdfService.generatePdfFromHtml(html);

        const outputPath = path.join(__dirname, 'test_output.pdf');
        fs.writeFileSync(outputPath, pdfBuffer);
        console.log('PDF generated successfully at:', outputPath);
    } catch (error) {
        console.error('PDF Generation Failed:', error);
    }
}

testPdf();
