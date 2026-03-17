const prisma = require('./src/config/prisma');

async function check() {
    const student = await prisma.student.findUnique({
        where: { studentUniqueId: 'S0009' }
    });
    console.log('Student S0009 QR Code path:', student.qrCode);
    await prisma.$disconnect();
}

check();

