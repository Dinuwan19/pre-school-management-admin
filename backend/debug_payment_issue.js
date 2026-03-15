const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('--- Debugging Payment Issue for S0007 ---');

        // 1. Find the student
        const student = await prisma.student.findFirst({
            where: {
                OR: [
                    { studentUniqueId: 'S0007' },
                    { fullName: { contains: 'pathum' } }
                ]
            }
        });

        if (!student) {
            console.log('Student not found.');
            return;
        }

        console.log(`Found Student: ${student.fullName} (ID: ${student.id}, UniqueID: ${student.studentUniqueId})`);

        // 2. Get recent payments for this student
        const payments = await prisma.payment.findMany({
            where: { studentId: student.id },
            orderBy: { createdAt: 'desc' }, // Recent first
            take: 5,
            include: {
                paymentAllocations: {
                    include: {
                        billingCategory: true
                    }
                }
            }
        });

        console.log(`Found ${payments.length} recent payments.`);

        for (const p of payments) {
            console.log(`\nPayment ID: ${p.id} | Receipt: ${p.receiptId || 'N/A'} | Amount: ${p.amount} | Date: ${p.createdAt}`);
            if (p.paymentAllocations.length > 0) {
                console.log('  Allocations:');
                p.paymentAllocations.forEach(pa => {
                    console.log(`    - Category: ${pa.billingCategory?.name} (${pa.billingCategory?.type}) | Amount: ${pa.amount} | Month: ${pa.month || 'N/A'}`);
                });
            } else {
                console.log('  No Allocations found.');
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
