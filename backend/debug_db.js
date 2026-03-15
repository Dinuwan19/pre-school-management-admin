const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function log(msg) {
    fs.appendFileSync('debug_output.txt', msg + '\n');
    console.log(msg);
}

async function main() {
    try {
        fs.writeFileSync('debug_output.txt', ''); // Clear file
        log('--- Finding Student ---');
        const students = await prisma.student.findMany({
            where: { fullName: { contains: 'dilmi' } }
        });

        if (students.length === 0) {
            log('No student found matching "dilmi"');
            return;
        }

        for (const s of students) {
            log(`Student: ${s.fullName} (ID: ${s.id})`);

            log('\n  -- Billings --');
            const billings = await prisma.billing.findMany({
                where: { studentId: s.id },
                orderBy: { createdAt: 'desc' },
                take: 10
            });
            billings.forEach(b => {
                log(`    ID: ${b.id}, Month: "${b.billingMonth}", Status: ${b.status}, Amount: ${b.amount}, Category: ${b.categoryId}`);
            });

            log('\n  -- Recent Payments (Last 5 linked) --');
            // 1. Linked Payments
            const linkedPayments = await prisma.payment.findMany({
                where: {
                    billingpayment: {
                        some: {
                            billing: { studentId: s.id }
                        }
                    }
                },
                include: { billingpayment: { include: { billing: true } } },
                orderBy: { createdAt: 'desc' },
                take: 5
            });
            log('    [Linked Payments]');
            linkedPayments.forEach(p => {
                log(`      ID: ${p.id}, Ref: "${p.transactionRef}", Amount: ${p.amountPaid}, Status: ${p.status}, Linked Month: ${p.billingpayment[0]?.billing?.billingMonth}`);
            });

            // 2. Unallocated Payments (Harder to guess, but we can search description/ref)
            log('\n  -- Unallocated Payments (Checking top 10 for name match) --');
            const unallocatedPayments = await prisma.payment.findMany({
                where: {
                    billingpayment: { none: {} },
                },
                orderBy: { createdAt: 'desc' },
                take: 10
            });
            unallocatedPayments.forEach(p => {
                // Check if it might belong to this student based on Ref or Note
                // Frontend format: [Student: Name]
                if (p.transactionRef && p.transactionRef.toLowerCase().includes(s.fullName.toLowerCase())) {
                    log(`      MATCH FOUND -> ID: ${p.id}, Ref: "${p.transactionRef}", Amount: ${p.amountPaid}, Status: ${p.status}`);
                } else {
                    // Just list recent ones
                    log(`      ? ID: ${p.id}, Ref: "${p.transactionRef}", Amount: ${p.amountPaid}, Status: ${p.status}`);
                }
            });
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
