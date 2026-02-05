require('dotenv').config();
const supabase = require('./src/config/supabase');

async function checkFile() {
    // List files in 'invoices' folder of 'receipts' bucket
    const { data, error } = await supabase.storage
        .from('receipts')
        .list('invoices');

    if (error) {
        console.error('Error listing files:', error);
        return;
    }
    console.log('Files in receipts/invoices:', data.map(f => f.name));
}

checkFile();
