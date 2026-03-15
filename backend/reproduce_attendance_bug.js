const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const dayjs = require('dayjs');

// Mock request/response objects for controller simulation
const mockReq = (body) => ({
    body,
    user: { id: 1, username: 'admin' }
});

const mockRes = () => {
    const res = {};
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data) => {
        res.data = data;
        return res;
    };
    return res;
};

const attendanceController = require('./src/controllers/attendance.controller');

async function main() {
    try {
        console.log('--- Setup ---');
        // 1. Find a test student
        const student = await prisma.student.findFirst({ where: { status: 'ACTIVE' } });
        if (!student) {
            console.log('No active student found.');
            return;
        }
        console.log(`Using Student: ${student.fullName} (ID: ${student.id})`);

        // 2. Clear attendance for today for this student
        const today = new Date(dayjs().format('YYYY-MM-DD'));
        await prisma.attendance.deleteMany({
            where: {
                studentId: student.id,
                attendanceDate: today
            }
        });
        console.log('Cleared today\'s attendance.');

        // 3. Test Bug 1: Checkout without Check-in
        console.log('\n--- Test 1: Checkout without Check-in ---');
        const req1 = mockReq({
            studentId: student.id,
            forceMode: 'CHECK_OUT', // Force checkout logic
            deviceId: 'TEST_DEVICE'
        });
        const res1 = mockRes();
        await attendanceController.scanAttendance(req1, res1, (err) => console.error(err));
        console.log('Status:', res1.statusCode);
        console.log('Response:', res1.data);

        // 4. Test Bug 2: Update Checkout after Checkout
        console.log('\n--- Test 2: Update Checkout (Double Scan) ---');

        // Setup: Check-in first
        await prisma.attendance.create({
            data: {
                studentId: student.id,
                attendanceDate: today,
                checkInTime: new Date(),
                status: 'PRESENT',
                markedById: 1,
                method: 'QR'
            }
        });

        // Setup: Check-out once
        const req2 = mockReq({
            studentId: student.id,
            forceMode: 'CHECK_OUT',
            deviceId: 'TEST_DEVICE'
        });
        const res2 = mockRes();
        await attendanceController.scanAttendance(req2, res2, (err) => console.error(err));
        console.log('First Checkout Response:', res2.data.message);

        // Action: Check-out AGAIN
        console.log('... Attempting second checkout ...');
        const req3 = mockReq({
            studentId: student.id,
            forceMode: 'CHECK_OUT',
            deviceId: 'TEST_DEVICE'
        });
        const res3 = mockRes();
        await attendanceController.scanAttendance(req3, res3, (err) => console.error(err));
        console.log('Second Checkout Status:', res3.statusCode); // Should be 200 currently (Bug)
        console.log('Second Checkout Response:', res3.data);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
