const reportController = require('./src/controllers/report.controller');
const prisma = require('./src/config/prisma');

async function testController() {
    console.log('Testing generateReport controller...');

    const req = {
        body: {
            type: 'Attendance Report',
            dateRange: 'This Month'
        },
        user: { id: 1 } // Mock user admin
    };

    const res = {
        json: (data) => console.log('Response Success:', JSON.stringify(data, null, 2)),
        status: (code) => ({
            json: (data) => console.log('Response Error (' + code + '):', JSON.stringify(data, null, 2))
        })
    };

    const next = (error) => {
        console.error('Controller Error:', error);
    };

    try {
        await reportController.generateReport(req, res, next);
    } catch (err) {
        console.error('Thrown Error:', err);
    } finally {
        await prisma.$disconnect();
    }
}

testController();
