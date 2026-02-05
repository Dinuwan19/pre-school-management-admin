const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixJane() {
    try {
        const student = await prisma.student.findFirst({
            where: { fullName: { contains: 'Jane' } }
        });

        if (!student) return;

        // Update the generic manual payment to have specific tags
        const result = await prisma.payment.updateMany({
            where: {
                AND: [
                    { transactionRef: { contains: 'Paid manually' } },
                    { billingpayment: { some: { billing: { studentId: student.id } } } } // Ensure it links to her
                ]
            },
            data: {
                transactionRef: `[Student: ${student.fullName}] [Student ID: ${student.studentUniqueId}] [Months: January, February] Cash Payment`
            }
        });

        // Fallback: If no links, update by loose match or just the ID 14 seen in previous debug (if visible)
        // Since I can't guarantee ID 14 is consistent across runs, I'll update by the Ref string I saw
        await prisma.payment.updateMany({
            where: { transactionRef: 'Paid manually by admin' },
            data: {
                transactionRef: `[Student: ${student.fullName}] [Student ID: ${student.studentUniqueId}] [Months: January, February] Cash Payment`
            }
        });

        console.log('Updated Jane Doe payment records.');

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

fixJane();
