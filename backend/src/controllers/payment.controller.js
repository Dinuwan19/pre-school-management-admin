const prisma = require('../config/prisma');
const { uploadFile } = require('../services/storage.service');
const { getNextReceiptNo, generateInvoice } = require('../services/invoice.service');

exports.submitPayment = async (req, res, next) => {
    try {
        let { billingIds, amountPaid, paymentMethod, transactionRef } = req.body;

        console.log('Payment Submit Payload:', JSON.stringify(req.body, null, 2));
        // console.log('Payment File:', req.file); // Buffer is large, careful logging

        let parsedBillingIds = [];

        // 1. Try direct array or string from billingIds
        if (billingIds) {
            if (Array.isArray(billingIds)) {
                parsedBillingIds = billingIds;
            } else if (typeof billingIds === 'string') {
                try {
                    const parsed = JSON.parse(billingIds);
                    parsedBillingIds = Array.isArray(parsed) ? parsed : [billingIds];
                } catch (e) {
                    parsedBillingIds = billingIds.split(',').map(id => id.trim()).filter(id => id);
                }
            }
        }
        // 2. Try billingIds[] from multipart standard
        else if (req.body['billingIds[]']) {
            const raw = req.body['billingIds[]'];
            parsedBillingIds = Array.isArray(raw) ? raw : [raw];
        }

        billingIds = parsedBillingIds;
        console.log('Resolved Billing IDs:', billingIds);

        const receiptUrl = req.file ? await uploadFile(req.file, 'receipts') : null;

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

        const payment = await prisma.payment.update({
            where: { id: parseInt(paymentId) },
            data: {
                status,
                verifiedById: verifierId,
                verifiedAt: new Date(),
                receiptNo: status === 'APPROVED' ? await getNextReceiptNo() : undefined
            },
            include: { billingpayment: true }
        });

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
