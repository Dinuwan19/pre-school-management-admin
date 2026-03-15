const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function main() {
    const logBuffer = [];
    const log = (msg) => {
        console.log(msg);
        logBuffer.push(typeof msg === 'object' ? JSON.stringify(msg, null, 2) : msg);
    };

    try {
        log('--- Finding Pending Payments for S0003 ---');

        // 1. Find student
        const student = await prisma.student.findUnique({
            where: { studentUniqueId: 'S0003' }
        });

        if (!student) {
            log('Student S0003 not found.');
            fs.writeFileSync('debug_duplicate_payments_output.txt', logBuffer.join('\n'));
            return;
        }
        log(`Student: ${student.fullName} (${student.id})`);

        // 2. Find Pending Payments
        const payments = await prisma.payment.findMany({
            where: {
                billingpayment: {
                    some: {
                        billing: {
                            studentId: student.id
                        }
                    }
                },
                status: 'PENDING'
            },
            include: {
                billingpayment: {
                    include: {
                        billing: true
                    }
                }
            }
        });

        log(`Found ${payments.length} PENDING payments.`);

        payments.forEach(p => {
            log(`\nPayment ID: ${p.id} | Amount: ${p.amountPaid} | Method: ${p.paymentMethod} | Created: ${p.createdAt}`);
            p.billingpayment.forEach(bp => {
                log(` - BillingID: ${bp.billingId} | Month: ${bp.billing.billingMonth} | Amount: ${bp.billing.amount} | Status: ${bp.billing.status}`);
            });
        });

        fs.writeFileSync('debug_duplicate_payments_output.txt', logBuffer.join('\n'));

    } catch (e) {
        console.error(e);
        log(e.toString());
        fs.writeFileSync('debug_duplicate_payments_output.txt', logBuffer.join('\n'));
    } finally {
        await prisma.$disconnect();
    }
}

main();
