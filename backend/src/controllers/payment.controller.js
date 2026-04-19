const prisma = require('../config/prisma');
const { uploadFile } = require('../services/storage.service');
const { getNextReceiptNo, generateInvoice } = require('../services/invoice.service');

exports.submitPayment = async (req, res, next) => {
    try {
        let { billingIds, amountPaid, paymentMethod, transactionRef } = req.body;

        // --- ROBUST PARSING START ---
        // Enhanced logging to stderr for visibility
        console.error('Payment Payload (Raw Body):', JSON.stringify(req.body, null, 2));

        // 1. Extract Transaction Ref (Note) with fallbacks
        // Frontend might send it as 'transactionRef', 'note', or 'description'
        if (!transactionRef) {
            transactionRef = req.body.note || req.body.description || '';
        }

        // 2. Parse Billing IDs (Robust)
        let parsedBillingIds = [];

        const rawIds = billingIds || req.body['billingIds[]'];

        if (rawIds) {
            if (Array.isArray(rawIds)) {
                parsedBillingIds = rawIds;
            } else if (typeof rawIds === 'string') {
                // Try JSON parse first
                try {
                    const parsed = JSON.parse(rawIds);
                    parsedBillingIds = Array.isArray(parsed) ? parsed : [parsed];
                } catch (e) {
                    // Fallback to comma split
                    parsedBillingIds = rawIds.split(',').map(id => id.trim()).filter(Boolean);
                }
            } else if (typeof rawIds === 'number') {
                parsedBillingIds = [rawIds];
            }
        }

        // Clean IDs (ensure numbers)
        parsedBillingIds = parsedBillingIds.map(id => parseInt(id)).filter(id => !isNaN(id));

        billingIds = parsedBillingIds;
        console.error('Resolved Billing IDs:', billingIds);
        console.error('Resolved TransactionRef:', transactionRef);
        // --- ROBUST PARSING END ---

        const receiptUrl = req.file ? await uploadFile(req.file, 'receipts') : null;

        // --- NEW: Parse billingMonths (Robust) ---
        let parsedBillingMonths = [];
        const rawMonths = req.body.billingMonths;
        if (rawMonths) {
            try {
                const parsed = typeof rawMonths === 'string' ? JSON.parse(rawMonths) : rawMonths;
                parsedBillingMonths = Array.isArray(parsed) ? parsed : [parsed];
            } catch (e) {
                if (typeof rawMonths === 'string') {
                    parsedBillingMonths = rawMonths.split(',').map(m => m.trim()).filter(Boolean);
                }
            }
        }
        // --- END: Parse billingMonths ---

        // Verify Locking: Check if any billingId is already PAID
        const idList = billingIds.map(id => parseInt(id));
        const existingBillings = await prisma.billing.findMany({
            where: { id: { in: idList } }
        });

        const alreadyPaid = existingBillings.find(b => b.status === 'PAID');
        if (alreadyPaid) {
            return res.status(400).json({ message: `Payment already completed for ${alreadyPaid.billingMonth}` });
        }

        const alreadyPending = existingBillings.find(b => b.status === 'PENDING' && paymentMethod !== 'CASH');
        if (alreadyPending) {
            return res.status(400).json({ message: `Payment verification is pending for ${alreadyPending.billingMonth}` });
        }

        // Get receipt number beforehand if CASH to keep transaction lean
        let receiptNo = null;
        if (paymentMethod === 'CASH') {
            receiptNo = await getNextReceiptNo();
        }

        // Use transaction to ensure payment and links are created together
        const payment = await prisma.$transaction(async (tx) => {
            const p = await tx.payment.create({
                data: {
                    amountPaid: parseFloat(amountPaid),
                    paymentMethod,
                    transactionRef,
                    receiptUrl,
                    status: paymentMethod === 'CASH' ? 'APPROVED' : 'PENDING',
                    receiptNo: receiptNo
                }
            });

            // --- ALLOCATION LOGIC: Handle billingMonths for future payments ---
            if (billingIds.length === 0 && parsedBillingMonths.length > 0 && req.body.studentId) {
                const sId = parseInt(req.body.studentId);
                for (const monthCode of parsedBillingMonths) {
                    // Check if bill already exists
                    let bill = await tx.billing.findFirst({
                        where: { studentId: sId, billingMonth: monthCode, categoryId: null }
                    });

                    if (!bill) {
                        // Auto-create standard monthly fee bill
                        bill = await tx.billing.create({
                            data: {
                                studentId: sId,
                                billingMonth: monthCode,
                                amount: 15000, // Standard fee
                                status: paymentMethod === 'CASH' ? 'PAID' : 'PENDING'
                            }
                        });
                        console.error(`Auto-created bill for ${monthCode} (Student: ${sId})`);
                    }

                    if (!billingIds.includes(bill.id)) {
                        billingIds.push(bill.id);
                    }
                }
            }
            // --- END ALLOCATION LOGIC ---

            // Ad-hoc Flow: If categoryId provided, use existing bill or create a new one
            if (req.body.categoryId && parsedBillingMonths.length === 0) {
                const catId = parseInt(req.body.categoryId);
                const sId = parseInt(req.body.studentId);

                // Fetch category details for amount validation or description
                const category = await tx.billingCategory.findUnique({ where: { id: catId } });

                // DUP-CHECK: See if there is an existing UNPAID/PENDING bill for this student and category
                let targetBilling = await tx.billing.findFirst({
                    where: { studentId: sId, categoryId: catId, status: { in: ['UNPAID', 'PENDING', 'OVERDUE'] } }
                });

                if (targetBilling) {
                    // Reuse found
                } else {
                    // Create NEW Ad-hoc Billing if none exists
                    targetBilling = await tx.billing.create({
                        data: {
                            studentId: sId,
                            billingMonth: 'Adhoc',
                            amount: parseFloat(amountPaid), // Use paid amount
                            status: paymentMethod === 'CASH' ? 'PAID' : 'PENDING',
                            categoryId: catId
                        }
                    });
                }

                // Add to billingIds list for linking
                if (!billingIds.includes(targetBilling.id)) {
                    billingIds.push(targetBilling.id);
                }
            }

            // Link to Billings
            const billingPaymentData = billingIds.map(id => ({
                billingId: parseInt(id),
                paymentId: p.id
            }));

            if (billingPaymentData.length > 0) {
                await tx.billingpayment.createMany({
                    data: billingPaymentData
                });

                // Update Billing statuses
                const newStatus = paymentMethod === 'CASH' ? 'PAID' : 'PENDING';
                await tx.billing.updateMany({
                    where: { id: { in: billingIds.map(id => parseInt(id)) } },
                    data: { status: newStatus }
                });
            }

            return p;
        });

        // Generate Invoice AFTER links are created (Fixing race condition)
        if (paymentMethod === 'CASH') {
            try {
                const invoiceUrl = await generateInvoice(payment.id);
                await prisma.payment.update({
                    where: { id: payment.id },
                    data: { invoiceUrl }
                });
                await prisma.billing.updateMany({
                    where: { id: { in: billingIds.map(id => parseInt(id)) } },
                    data: { invoiceUrl }
                });
            } catch (invError) {
                console.error('Initial Cash Invoice Gen Error:', invError);
            }
        }

        res.status(201).json(payment);
    } catch (error) {
        next(error);
    }
};

exports.getPendingPayments = async (req, res, next) => {
    try {
        const payments = await prisma.payment.findMany({
            where: { status: 'PENDING' },
            include: {
                billingpayment: {
                    include: {
                        billing: {
                            include: {
                                student: true
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(payments);
    } catch (error) {
        next(error);
    }
};

exports.verifyPayment = async (req, res, next) => {
    try {
        const { paymentId, status } = req.body; // status: APPROVED or REJECTED
        const verifierId = req.user.id;

        let payment;
        let retries = 3;

        while (retries > 0) {
            try {
                payment = await prisma.payment.update({
                    where: { id: parseInt(paymentId) },
                    data: {
                        status,
                        verifiedById: verifierId,
                        verifiedAt: new Date(),
                        receiptNo: status === 'APPROVED' ? await getNextReceiptNo() : undefined
                    },
                    include: { billingpayment: true }
                });
                break; // Success
            } catch (err) {
                if (err.code === 'P2002' && err.meta?.target?.includes('receiptNo')) {
                    console.warn(`ReceiptNo collision detected. Retrying... Attempts left: ${retries - 1}`);
                    retries--;
                    if (retries === 0) throw new Error('Failed to generate unique receipt number after retries');
                    await new Promise(r => setTimeout(r, 200)); // Wait 200ms
                } else {
                    throw err;
                }
            }
        }

        // Generate Invoice if APPROVED
        if (status === 'APPROVED') {
            try {
                const invoiceUrl = await generateInvoice(payment.id);
                await prisma.payment.update({
                    where: { id: payment.id },
                    data: { invoiceUrl }
                });
                const billingIds = payment.billingpayment.map(bp => bp.billingId);
                await prisma.billing.updateMany({
                    where: { id: { in: billingIds } },
                    data: { invoiceUrl }
                });
            } catch (invError) {
                console.error('Approval Invoice Gen Error:', invError);
            }
        }

        const billingIds = payment.billingpayment.map(bp => bp.billingId);
        const finalBillingStatus = status === 'APPROVED' ? 'PAID' : 'UNPAID';

        await prisma.billing.updateMany({
            where: { id: { in: billingIds } },
            data: { status: finalBillingStatus }
        });

        // REJECTION NOTIFICATION LOGIC
        if (status === 'REJECTED' && req.body.rejectionReason) {
            try {
                // Find student and parent associated with this payment
                const firstBilling = await prisma.billing.findFirst({
                    where: { id: { in: billingIds } },
                    include: { student: true }
                });

                if (firstBilling && firstBilling.student) {
                    const parentId = firstBilling.student.parentId;
                    const parent = await prisma.parent.findUnique({
                        where: { id: parentId },
                        select: { userId: true }
                    });

                    if (parent && parent.userId) {
                        await prisma.notification.create({
                            data: {
                                title: 'Payment Rejected',
                                message: `Your payment of Rs. ${payment.amountPaid} was rejected. Reason: ${req.body.rejectionReason}. Please resubmit with correct details.`,
                                targetRole: 'PARENT',
                                targetParentId: parent.userId,
                                createdById: verifierId,
                                expiresAt: dayjs().add(1, 'day').toDate() // 1 day announcement
                            }
                        });
                    }
                }
            } catch (notifyError) {
                console.error('Rejection Notification Error:', notifyError);
            }
        }

        res.json({ message: `Payment ${status}`, payment });
    } catch (error) {
        next(error);
    }
};

exports.getPaymentHistory = async (req, res, next) => {
    try {
        const payments = await prisma.payment.findMany({
            where: { status: { in: ['APPROVED', 'REJECTED'] } },
            include: {
                billingpayment: {
                    include: {
                        billing: {
                            include: {
                                student: true
                            }
                        }
                    }
                },
                user: true // verifier
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(payments);
    } catch (error) {
        next(error);
    }
};
