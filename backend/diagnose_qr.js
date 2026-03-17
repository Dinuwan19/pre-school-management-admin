const prisma = require('./src/config/prisma');
const fs = require('fs');
const path = require('path');

async function check() {
    const student = await prisma.student.findUnique({
        where: { studentUniqueId: 'S0009' }
    });
    
    if (!student) {
        console.log('Student S0009 not found');
        return;
    }

    console.log('Student S0009 found. QR Path in DB:', student.qrCode);
    
    // Check if path is absolute or relative
    let filePath = student.qrCode;
    if (filePath.startsWith('/uploads/')) {
        filePath = path.join(__dirname, filePath);
    }
    
    console.log('Resolved Absolute Path:', filePath);
    
    if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        console.log(`✅ File exists! Size: ${stats.size} bytes`);
    } else {
        console.log('❌ File does not exist at that path.');
    }
    
    // Check common "uploads" location
    const uploadsPath = path.join(__dirname, 'uploads', 'student-documents', path.basename(student.qrCode || ''));
    console.log('Checking fallback path:', uploadsPath);
    if (fs.existsSync(uploadsPath)) {
        console.log('✅ File exists at fallback path!');
    } else {
        console.log('❌ File does not exist at fallback path either.');
    }

    await prisma.$disconnect();
}

check();
