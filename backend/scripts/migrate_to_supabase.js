const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');
const { uploadLocalFile } = require('../src/services/storage.service');

// Configuration
// If you want to skip certain tables, comment them out.
const UPLOADS_DIR = path.join(__dirname, '../uploads');

// Map database fields to Supabase buckets
// Format: { model: 'student', field: 'photoUrl', bucket: 'student-photos', type: 'image/jpeg' }
const MIGRATION_MAP = [
    { model: 'student', field: 'photoUrl', bucket: 'student-photos', mime: 'image/jpeg' },
    { model: 'student', field: 'birthCertPdf', bucket: 'student-documents', mime: 'application/pdf' },
    { model: 'payment', field: 'receiptUrl', bucket: 'receipts', mime: 'image/jpeg' },
    { model: 'teacherprofile', field: 'qualificationPdf', bucket: 'teacher-documents', mime: 'application/pdf' },
    { model: 'expense', field: 'receiptUrl', bucket: 'receipts', mime: 'image/jpeg' },
    { model: 'event', field: 'mediaUrl', bucket: 'events', mime: 'image/jpeg' }
];

async function migrate() {
    console.log('🚀 Starting Supabase Bulk Migration...');

    for (const mapping of MIGRATION_MAP) {
        console.log(`\n📂 Processing ${mapping.model}.${mapping.field} -> Bucket: ${mapping.bucket}`);

        // Fetch all records where field is not null and starts with /uploads (meaning local)
        // Note: We use raw query or Prisma findMany. Prisma is safer.
        const records = await prisma[mapping.model].findMany({
            where: {
                [mapping.field]: {
                    not: null,
                    startsWith: '/uploads' // Only migrate local files
                }
            }
        });

        console.log(`found ${records.length} records to migrate.`);

        for (const record of records) {
            const dbPath = record[mapping.field];
            // dbPath is like "/uploads/file-123.jpg"
            const localFilename = path.basename(dbPath);
            const absolutePath = path.join(UPLOADS_DIR, localFilename);

            if (fs.existsSync(absolutePath)) {
                try {
                    const fileBuffer = fs.readFileSync(absolutePath);
                    const publicUrl = await uploadLocalFile(localFilename, fileBuffer, mapping.mime, mapping.bucket);

                    // Update DB with new URL
                    await prisma[mapping.model].update({
                        where: { id: record.id }, // Assumes 'id' is primary key (Int)
                        data: { [mapping.field]: publicUrl }
                    });

                    console.log(`✅ Migrated: ${localFilename} -> ${publicUrl}`);
                } catch (error) {
                    console.error(`❌ Failed: ${localFilename} - ${error.message}`);
                }
            } else {
                console.warn(`⚠️ File missing on disk: ${absolutePath}`);
            }
        }
    }

    console.log('\n🎉 Migration Complete!');
}

migrate()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
