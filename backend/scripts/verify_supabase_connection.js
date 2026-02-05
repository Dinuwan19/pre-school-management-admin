require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function verifyConnection() {
    console.log("🔍 Starting Supabase Verification...");

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error("❌ Missing SUPABASE_URL or SUPABASE_KEY in .env");
        process.exit(1);
    }

    console.log(`✅ URL: ${supabaseUrl}`);
    console.log(`✅ Key: ${supabaseKey.substring(0, 10)}... (Hidden)`);

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Test Bucket: 'student-photos' (We know this exists from previous context)
    const BUCKET = 'student-photos';
    const TEST_FILE_NAME = 'connection_test.txt';
    const TEST_CONTENT = 'Supabase verification ' + new Date().toISOString();

    try {
        // 1. Validate Access
        console.log(`\n📂 Checking bucket: ${BUCKET}...`);
        const { data: bucketData, error: bucketError } = await supabase.storage.getBucket(BUCKET);

        if (bucketError) {
            // getBucket might fail if RLS policies are strict for Anon, but usually getBucket isn't public. 
            // Let's try listing instead as a proxy for access.
            console.log("   (getBucket call failed, likely permissions, trying upload as definitive test...)");
        } else {
            console.log("   Bucket found.");
        }

        // 2. Test Upload
        console.log("📤 Attempting upload...");
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from(BUCKET)
            .upload(TEST_FILE_NAME, Buffer.from(TEST_CONTENT), {
                upsert: true
            });

        if (uploadError) {
            console.error("❌ Upload Failed:", uploadError.message);
            throw uploadError;
        }
        console.log("✅ Upload successful:", uploadData.path);

        // 3. Test Public URL
        console.log("🔗 Generating Public URL...");
        const { data: urlData } = supabase.storage
            .from(BUCKET)
            .getPublicUrl(TEST_FILE_NAME);

        console.log("✅ Public URL:", urlData.publicUrl);

        // 4. Test Cleanup (Delete)
        console.log("🗑️ Cleaning up (Deleting test file)...");
        const { error: deleteError } = await supabase.storage
            .from(BUCKET)
            .remove([TEST_FILE_NAME]);

        if (deleteError) {
            console.warn("⚠️ Cleanup failed (Deletion might require Service Role if RLS is strict):", deleteError.message);
        } else {
            console.log("✅ Cleanup successful.");
        }

        console.log("\n🎉 SUPABASE CONNECTION CONFIRMED WORKING!");

    } catch (err) {
        console.error("\n❌ VERIFICATION FAILED:", err.message);
    }
}

verifyConnection();
