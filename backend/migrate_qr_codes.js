const prisma = require('./src/config/prisma');
const { uploadLocalFile } = require('./src/services/storage.service');

async function migrateQRCodes() {
    console.log('--- Starting QR Code Migration to Supabase ---');

    try {
        const students = await prisma.student.findMany({
            where: {
                qrCode: {
                    startsWith: 'data:image' // Only migrate base64 ones
                }
            }
        });

        console.log(`Found ${students.length} students with base64 QR codes.`);

        for (const student of students) {
            try {
                console.log(`Migrating QR for: ${student.fullName} (${student.studentUniqueId})`);

                // Extract buffer from base64
                const base64Data = student.qrCode.split(',')[1];
                const buffer = Buffer.from(base64Data, 'base64');

                const filename = `qr-${student.studentUniqueId}-${Date.now()}.png`;
                const publicUrl = await uploadLocalFile(filename, buffer, 'image/png', 'student-documents');

                await prisma.student.update({
                    where: { id: student.id },
                    data: { qrCode: publicUrl }
                });

                console.log(`   Done: ${publicUrl}`);
            } catch (err) {
                console.error(`   Failed for student ${student.id}:`, err.message);
            }
        }

        console.log('--- Migration Complete ---');

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

migrateQRCodes();
