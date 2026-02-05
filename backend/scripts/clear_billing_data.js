const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load env vars first
dotenv.config({ path: path.join(__dirname, '../.env') });

const logFile = path.join(__dirname, '../cleanup_result.txt');
// Clear log file
if (fs.existsSync(logFile)) fs.unlinkSync(logFile);

const log = (msg) => {
    console.log(msg);
    fs.appendFileSync(logFile, msg + '\n');
};

const errorLog = (msg, err) => {
    console.error(msg, err);
    fs.appendFileSync(logFile, `ERROR: ${msg} ${err?.message || err}\n`);
};

// Import project configs
const prisma = require('../src/config/prisma');
const supabase = require('../src/config/supabase');

async function clearAllBillingData() {
    log('🚀 Starting Comprehensive Billing Data Cleanup...');

    try {
        if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
            throw new Error('Supabase credentials missing in environment.');
        }

        // 1. Clear Database Tables
        log('📦 Wiping Database Records...');

        const bpCount = await prisma.billingpayment.deleteMany({});
        log(`✅ Deleted ${bpCount.count} BillingPayment links.`);

        const pCount = await prisma.payment.deleteMany({});
        log(`✅ Deleted ${pCount.count} Payment records.`);

        const bCount = await prisma.billing.deleteMany({});
        log(`✅ Deleted ${bCount.count} Billing records.`);

        // 2. Clear Supabase Cloud Storage
        log('\n☁️ Clearing Supabase Cloud Storage (receipts bucket)...');

        const { data: files, error: listError } = await supabase.storage
            .from('receipts')
            .list('', { limit: 1000 });

        if (listError) {
            errorLog('❌ Error listing files:', listError);
        } else if (files && files.length > 0) {
            log(`🔍 Found ${files.length} items to remove.`);

            for (const file of files) {
                if (file.id === null || file.id === undefined) {
                    // Folder
                    const { data: subFiles, error: subError } = await supabase.storage
                        .from('receipts')
                        .list(file.name);

                    if (subFiles && subFiles.length > 0) {
                        const pathsToDelete = subFiles.map(f => `${file.name}/${f.name}`);
                        const { error: delError } = await supabase.storage
                            .from('receipts')
                            .remove(pathsToDelete);

                        if (delError) errorLog(`❌ Error deleting in ${file.name}:`, delError);
                        else log(`✅ Cleared folder: ${file.name} (${subFiles.length} files)`);
                    }
                } else {
                    // File
                    const { error: delError } = await supabase.storage
                        .from('receipts')
                        .remove([file.name]);

                    if (delError) errorLog(`❌ Error deleting file ${file.name}:`, delError);
                    else log(`✅ Deleted root file: ${file.name}`);
                }
            }
        } else {
            log('ℹ️ No files found in Supabase storage.');
        }

        log('\n✨ Cleanup Complete! Billing system is now 100% fresh.');

    } catch (error) {
        errorLog('🛑 Cleanup Failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

clearAllBillingData();
