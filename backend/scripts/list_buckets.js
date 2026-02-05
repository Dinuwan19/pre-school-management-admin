require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function listBuckets() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let output = "🔍 Checking Supabase Buckets...\n";
    try {
        const { data, error } = await supabase.storage.listBuckets();

        if (error) {
            output += `❌ Error listing buckets: ${error.message}\n`;
        } else {
            output += "✅ Available Buckets:\n";
            data.forEach(b => {
                output += ` - "${b.name}" (${b.public ? 'Public' : 'Private'})\n`;
            });
        }
    } catch (err) {
        output += `❌ Exception: ${err.message}\n`;
    }

    fs.writeFileSync('buckets.txt', output);
    console.log("Bucket list written to buckets.txt");
}

listBuckets();
