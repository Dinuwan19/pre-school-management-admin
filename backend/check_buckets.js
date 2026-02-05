require('dotenv').config();
const supabase = require('./src/config/supabase');

async function checkBuckets() {
    const { data, error } = await supabase.storage.listBuckets();
    if (error) {
        console.error('Error listing buckets:', error);
        return;
    }
    console.log('Available Buckets:', data.map(b => b.name));
}

checkBuckets();
