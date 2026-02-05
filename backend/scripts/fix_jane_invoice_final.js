require('dotenv').config({ path: '../.env' });
const { PrismaClient } = require('@prisma/client');
const PDFDocument = require('pdfkit');
const { createClient } = require('@supabase/supabase-js');

// Init Clients
const prisma = new PrismaClient();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function manualGenerate() {
    try {
        console.log('--- MANUAL INVOICE GENERATION ---');

        const payment = await prisma.payment.findFirst({
            where: { transactionRef: { contains: 'Jane' }, invoiceUrl: null },
            include: { billingpayment: { include: { billing: { include: { student: true } } } } }
        });

        if (!payment) {
            console.log('No eligible Jane Doe payment found (maybe already fixed?)');
            return;
        }

        console.log(`Processing Payment ID: ${payment.id}`);

        // Create PDF Buffer
        const doc = new PDFDocument({ margin: 50 });
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));

        doc.fontSize(20).text('INVOICE', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Receipt No: ${payment.receiptNo || 'RCP-TEMP'}`);
        doc.text(`Date: ${new Date().toLocaleDateString()}`);
        doc.text(`Amount: Rs. ${payment.amountPaid}`);
        doc.text(`Status: ${payment.status}`);
        doc.text(`Ref: ${payment.transactionRef}`);
        doc.end();

        const pdfData = await new Promise(resolve => doc.on('end', () => resolve(Buffer.concat(buffers))));

        // Upload to Supabase
        const fileName = `invoices/INV_MANUAL_${payment.id}_${Date.now()}.pdf`;
        const { data, error } = await supabase.storage
            .from('receipts') // Using receipts bucket as fallback or invoices if exists
            .upload(fileName, pdfData, { contentType: 'application/pdf' });

        if (error) throw error;

        // Get Public URL
        const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(fileName);

        // Update DB
        await prisma.payment.update({
            where: { id: payment.id },
            data: { invoiceUrl: publicUrl }
        });

        console.log(`Success! Invoice saved at: ${publicUrl}`);

    } catch (e) {
        console.error('Manual Script Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

manualGenerate();
