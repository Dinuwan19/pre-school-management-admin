const PDFDocument = require('pdfkit');
const prisma = require('../config/prisma');
const fs = require('fs');
const path = require('path');
const dayjs = require('dayjs');

/**
 * Generates a sequential receipt number
 */
exports.getNextReceiptNo = async () => {
    const lastPayment = await prisma.payment.findFirst({
        where: { receiptNo: { not: null } },
        orderBy: [
            { verifiedAt: 'desc' },
            { id: 'desc' }
        ]
    });

    if (!lastPayment || !lastPayment.receiptNo) {
        return 'RCP-10001';
    }

    const lastNo = lastPayment.receiptNo.replace('RCP-', '');
    const nextNo = parseInt(lastNo) + 1;
    return `RCP-${nextNo}`;
};

/**
 * Generates a PDF invoice for a given payment
 * @param {Object} payment - Payment object with included billing and student data
 */
exports.generateInvoice = async (paymentId) => {
    try {
        const payment = await prisma.payment.findUnique({
            where: { id: paymentId },
            include: {
                billingpayment: {
                    include: {
                        billing: {
                            include: {
                                billingCategory: true,
                                student: {
                                    include: {
                                        classroom: true,
                                        parent_student_parentIdToparent: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!payment) throw new Error('Payment record not found');

        // Extract student info from first billing link
        let firstBilling = payment.billingpayment[0]?.billing;
        let student = firstBilling?.student;

        // Fallback for unallocated payments: Parse from transactionRef
        if (!student && payment.transactionRef) {
            const nameMatch = payment.transactionRef.match(/\[Student:\s(.*?)]/);
            const idMatch = payment.transactionRef.match(/\[Student ID:\s(.*?)]/);

            if (nameMatch) {
                const studentName = nameMatch[1];
                const studentUniqueId = idMatch ? idMatch[1] : null;

                // Try to find the student in DB by ID first, then name
                const foundStudent = await prisma.student.findFirst({
                    where: studentUniqueId ? { studentUniqueId: studentUniqueId } : { fullName: { contains: studentName } },
                    include: { classroom: true, parent_student_parentIdToparent: true }
                });

                if (foundStudent) {
                    student = foundStudent;
                } else {
                    // Minimal student object if not found in DB
                    student = {
                        fullName: studentName,
                        studentUniqueId: studentUniqueId || 'N/A'
                    };
                }
            }
        }

        const parent = student?.parent_student_parentIdToparent;

        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ margin: 50 });
            let buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', async () => {
                const pdfData = Buffer.concat(buffers);

                // Upload to Local File System
                const fileName = `${payment.receiptNo}-${Date.now()}.pdf`;
                const uploadDir = path.join(__dirname, '../../uploads/receipts/invoices');
                
                try {
                    if (!fs.existsSync(uploadDir)) {
                        fs.mkdirSync(uploadDir, { recursive: true });
                    }
                    fs.writeFileSync(path.join(uploadDir, fileName), pdfData);
                    resolve(`/uploads/receipts/invoices/${fileName}`);
                } catch (error) {
                    console.error('Invoice Upload Error:', error);
                    return reject(error);
                }
            });

            // --- PDF Layout ---

            // Header: Logo and School Name
            const logoPath = path.join(__dirname, '../../../parent-app/assets/logo.png');
            if (require('fs').existsSync(logoPath)) {
                doc.image(logoPath, 50, 45, { width: 60 });
            }

            doc.fillColor('#7B57E4')
                .fontSize(24)
                .text('MALKAKULU FUTURE', 120, 50, { align: 'left' })
                .text('MIND MONTESSORI', 120, 80, { align: 'left' });

            doc.fillColor('#7B57E4')
                .fontSize(10)
                .text('205 ,A kadawatha road . Ja ela', 120, 110);

            doc.moveTo(50, 140).lineTo(550, 140).stroke('#7B57E4');

            doc.fontSize(18)
                .fillColor('#7B57E4')
                .text('PAYMENT INVOICE', 0, 155, { align: 'center' });

            doc.moveTo(50, 185).lineTo(550, 185).stroke('#7B57E4');

            // Metadata
            doc.fontSize(11).fillColor('#333');
            doc.text(`RECEIPT NO: ${payment.receiptNo || 'N/A'}`, 50, 210);
            doc.text(`DATE: ${new Date(payment.createdAt).toLocaleDateString()}`, 50, 225);

            // Bill To
            doc.font('Helvetica-Bold').text('Bill To:', 50, 255);
            doc.font('Helvetica').fontSize(10);
            doc.text(`Student ID: ${student?.studentUniqueId || 'N/A'}`, 50, 270);
            doc.text(`Student Name: ${student?.fullName || 'N/A'}`, 50, 285);
            doc.text(`Classroom: ${student?.classroom?.name || 'N/A'}`, 50, 300);
            doc.text(`Mobile No.: ${parent?.phone || 'N/A'}`, 50, 315);

            // Table Header
            const tableTop = 360;
            doc.rect(50, tableTop, 500, 25).fill('#7B57E4');
            doc.fillColor('#FFF').font('Helvetica-Bold').fontSize(10);
            doc.text('No', 65, tableTop + 8);
            doc.text('Description', 110, tableTop + 8);
            doc.text('Amount', 450, tableTop + 8, { align: 'right', width: 80 });

            // Table Rows
            doc.fillColor('#333').font('Helvetica');
            let itemY = tableTop + 35;

            if (payment.billingpayment && payment.billingpayment.length > 0) {
                payment.billingpayment.forEach((bp, index) => {
                    const billing = bp.billing;
                    doc.text(index + 1, 65, itemY);

                    // Handle comma-separated or non-date billing months
                    // Handle category name or monthly fee
                    let description = billing.billingCategory ? billing.billingCategory.name : 'Monthly Fee';
                    if (!billing.billingCategory && billing.billingMonth) {
                        // Split by comma or space if consolidated
                        const rawMonths = billing.billingMonth.split(',').map(m => m.trim());
                        const formattedMonths = rawMonths.map(m => {
                            const date = dayjs(m);
                            return date.isValid() ? date.format('MMMM') : m;
                        }).join(', ');

                        description = `Fee (${formattedMonths})`;
                    }

                    doc.text(description, 110, itemY);
                    doc.text(parseFloat(billing.amount).toLocaleString(), 450, itemY, { align: 'right', width: 80 });

                    doc.moveTo(50, itemY + 15).lineTo(550, itemY + 15).stroke('#EEE');
                    itemY += 25;
                });
            } else {
                // Fallback for unallocated payments: Parse months from transactionRef
                const monthMatch = payment.transactionRef?.match(/\[Months:\s(.*?)]/);
                if (monthMatch) {
                    const monthsStr = monthMatch[1]; // e.g., "Jan, Feb"
                    const monthList = monthsStr.split(',').map(m => m.trim()).filter(m => m);

                    const amountPerMonth = parseFloat(payment.amountPaid) / monthList.length;

                    monthList.forEach((m, idx) => {
                        doc.text(idx + 1, 65, itemY);
                        doc.text(`${m} Fee`, 110, itemY);
                        doc.text(amountPerMonth.toLocaleString(), 450, itemY, { align: 'right', width: 80 });
                        doc.moveTo(50, itemY + 15).lineTo(550, itemY + 15).stroke('#EEE');
                        itemY += 25;
                    });
                } else {
                    // Total fallback
                    doc.text('1', 65, itemY);
                    doc.text('Monthly School Fee (Unallocated)', 110, itemY);
                    doc.text(parseFloat(payment.amountPaid).toLocaleString(), 450, itemY, { align: 'right', width: 80 });
                    doc.moveTo(50, itemY + 15).lineTo(550, itemY + 15).stroke('#EEE');
                    itemY += 25;
                }
            }

            // Total
            doc.font('Helvetica-Bold').fontSize(12);
            doc.text('Total:', 380, itemY + 10);
            doc.text(`${parseFloat(payment.amountPaid).toLocaleString()}`, 450, itemY + 10, { align: 'right', width: 80 });

            // Footer
            const footerTop = 700;
            doc.moveTo(400, footerTop).lineTo(550, footerTop).stroke('#8B4513');
            doc.fontSize(10).fillColor('#333').text('Accountant', 400, footerTop + 10, { align: 'center', width: 150 });

            doc.end();
        });
    } catch (error) {
        console.error('Invoice Generation Error:', error);
        throw error;
    }
};
