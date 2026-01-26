const prisma = require('../config/prisma');

exports.submitPayment = async (req, res, next) => {
    try {
        let { billingIds, amountPaid, paymentMethod, transactionRef } = req.body;

        // Handle billingIds if sent as string (common with multipart/form-data)
        if (typeof billingIds === 'string') {
            try {
                billingIds = JSON.parse(billingIds);
            } catch (e) {
                // If it's just a single ID or comma separated
                billingIds = billingIds.split(',').map(id => id.trim());
            }
        } else if (!Array.isArray(billingIds)) {
            // Check for billingIds[] from multipart
            billingIds = req.body['billingIds[]'] || [billingIds];
        }

        const receiptUrl = req.file ? `/uploads/${req.file.filename}` : null;

        // Create the Payment
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

        await prisma.billingPayment.createMany({
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
