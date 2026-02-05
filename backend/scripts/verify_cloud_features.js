require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function verifyCloudFeatures() {
    console.log("🔍 Starting Cloud Features Verification...");

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error("❌ Missing SUPABASE_URL or SUPABASE_KEY in .env");
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const tests = [
        { feature: 'Vaccine Card', bucket: 'student-documents', file: 'test_vaccine.txt' },
        { feature: 'Parent Avatar', bucket: 'student-photos', file: 'test_parent_avatar.txt' },
        { feature: 'Cloud Report', bucket: 'reports', file: 'test_report.pdf' }
    ];

    console.log(`📋 Testing ${tests.length} Features...\n`);

    for (const test of tests) {
        try {
            console.log(`Testing Feature: [${test.feature}] -> Bucket: [${test.bucket}]`);

            // 1. Upload
            const content = `Test content for ${test.feature} - ${new Date().toISOString()}`;
            const { data, error } = await supabase.storage
                .from(test.bucket)
                .upload(test.file, Buffer.from(content), { upsert: true });

            if (error) {
                console.error(`   ❌ Upload Failed: ${error.message}`);
                console.log(`      (Hint: Does bucket '${test.bucket}' exist? Is it Public/Private correctly?)`);
                continue;
            }
            console.log(`   ✅ Upload Success: ${data.path}`);

            // 2. Get URL
            const { data: urlData } = supabase.storage.from(test.bucket).getPublicUrl(test.file);
            console.log(`   🔗 URL: ${urlData.publicUrl}`);

            // 3. Cleanup
            await supabase.storage.from(test.bucket).remove([test.file]);
            console.log(`   🗑️  Cleanup Success`);

        } catch (err) {
            console.error(`   ❌ Unexpected Error: ${err.message}`);
        }
        console.log('-----------------------------------');
    }

    console.log("\n✅ Feature Verification Complete.");
}

verifyCloudFeatures();
