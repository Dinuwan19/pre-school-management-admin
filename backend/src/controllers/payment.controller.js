const prisma = require('../config/prisma');

exports.submitPayment = async (req, res, next) => {
    try {
        let { billingIds, amountPaid, paymentMethod, transactionRef } = req.body;

        console.log('Payment Submit Payload:', JSON.stringify(req.body, null, 2));
        console.log('Payment File:', req.file);

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

        const receiptUrl = req.file ? `/uploads/${req.file.filename}` : null;

        // Verify Locking: Check if any billingId is already PAID or PENDING (waiting approval)
        // Actually, PENDING is okay to re-upload if rejected? 
        // But plan says "If parent pays... Payment button disabled".
        // Backend key check: If status is PAID, reject.
        // We need to fetch billings first.
        const idList = billingIds.map(id => parseInt(id));
        const existingBillings = await prisma.billing.findMany({
            where: { id: { in: idList } }
        });

        const alreadyPaid = existingBillings.find(b => b.status === 'PAID');
        if (alreadyPaid) {
            return res.status(400).json({ message: `Payment already completed for ${alreadyPaid.billingMonth}` });
        }

        // Also check if PENDING? Requirement "Payment button becomes disabled".
        // Usually we lock PENDING too to prevent double submission until rejected.
        const alreadyPending = existingBillings.find(b => b.status === 'PENDING' && paymentMethod !== 'CASH');
        // CAUTION: Cash payments set status to PAID immediately in logic, handled by admin.
        // If parent uploads receipt, it goes to PENDING.
        // If there is already a PENDING billing (meaning previous upload), prevent new upload?
        if (alreadyPending) {
            return res.status(400).json({ message: `Payment verification is pending for ${alreadyPending.billingMonth}` });
        }
        const payment = await prisma.payment.create({
            data: {
                amountPaid: parseFloat(amountPaid),
                paymentMethod,
                transactionRef,
                receiptUrl,
                status: paymentMethod === 'CASH' ? 'APPROVED' : 'PENDING'
            }
        });

        // Link to Billings
        const billingPaymentData = billingIds.map(id => ({
            billingId: parseInt(id),
            paymentId: payment.id
        }));

        await prisma.billingpayment.createMany({
            data: billingPaymentData
        });

        // Update Billing statuses to PENDING (if bank) or PAID (if cash)
        const newStatus = paymentMethod === 'CASH' ? 'PAID' : 'PENDING';
        await prisma.billing.updateMany({
            where: { id: { in: billingIds.map(id => parseInt(id)) } },
            data: { status: newStatus }
        });

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
                verifiedAt: new Date()
            },
            include: { billingpayment: true }
        });

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
