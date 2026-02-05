const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyStorageRecords() {
    console.log('🔍 Starting Database Storage Audit...\n');

    try {
        const students = await prisma.student.findMany({
            select: {
                studentUniqueId: true,
                fullName: true,
                photoUrl: true,
                birthCertPdf: true,
                vaccineCardPdf: true
            }
        });

        console.log(`📊 Found ${students.length} student records.\n`);

        students.forEach(student => {
            console.log(`Student: ${student.fullName} (${student.studentUniqueId})`);

            const checkFile = (label, url) => {
                if (url) {
                    const isSupabase = url.includes('supabase.co');
                    const status = isSupabase ? '✅ Cloud' : '⚠️ Local/Other';
                    console.log(`  - ${label}: ${status} | ${url}`);
                } else {
                    console.log(`  - ${label}: ❌ Missing`);
                }
            };

            checkFile('Photo', student.photoUrl);
            checkFile('Birth Cert', student.birthCertPdf);
            checkFile('Vaccine Card', student.vaccineCardPdf);
            console.log('---');
        });

        const parents = await prisma.parent.findMany({
            select: {
                parentUniqueId: true,
                fullName: true,
                photoUrl: true
            }
        });

        console.log(`\n📊 Found ${parents.length} parent records.\n`);

        parents.forEach(parent => {
            console.log(`Parent: ${parent.fullName} (${parent.parentUniqueId})`);
            if (parent.photoUrl) {
                const isSupabase = parent.photoUrl.includes('supabase.co');
                console.log(`  - Photo: ${isSupabase ? '✅ Cloud' : '⚠️ Local'} | ${parent.photoUrl}`);
            } else {
                console.log('  - Photo: ❌ Missing');
            }
            console.log('---');
        });

    } catch (error) {
        console.error('❌ Error during audit:', error);
    } finally {
        await prisma.$disconnect();
    }
}

verifyStorageRecords();
