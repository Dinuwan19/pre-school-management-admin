const pdfService = require('./src/services/pdf.service');
const fs = require('fs');

async function debugPdf() {
    const sampleData = {
        generatedBy: 'System Debugger',
        timeframe: 'January 2026 - April 2026',
        chartData: {
            labels: ['January', 'February', 'March', 'April'],
            datasets: [{
                label: 'Class A',
                data: [10, 15, 20, 25],
                backgroundColor: '#7B57E4'
            }]
        },
        lowAttendanceStudents: [],
        classCount: 1,
        studentCount: 10
    };

    const html = pdfService.generateAttendanceSummaryTemplate(sampleData);
    console.log('HTML Length:', html.length);
    
    try {
        console.log('Generating PDF...');
        const buffer = await pdfService.generatePdfFromHtml(html);
        fs.writeFileSync('debug_output.pdf', buffer);
        console.log('PDF saved to debug_output.pdf');
    } catch (err) {
        console.error('PDF Generation Error:', err);
    }
}

debugPdf();
