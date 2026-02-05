const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixPayments() {
    try {
        // 1. Get Student 03
        const student = await prisma.student.findFirst({
            where: { fullName: { contains: 'student 03' } }
        });

        if (!student) {
            console.log('Student 03 not found');
            return;
        }

        console.log(`Found Student: ${student.fullName} (${student.id}) | UID: ${student.studentUniqueId}`);

        // 2. Find payments with NULL transactionRef
        const payments = await prisma.payment.findMany({
            where: { transactionRef: null },
            orderBy: { createdAt: 'desc' }
        });

        console.log(`Found ${payments.length} payments with NULL ref.`);

        // 3. Update them
        for (const p of payments) {
            const newRef = `[Student: ${student.fullName}] [Student ID: ${student.studentUniqueId}] [Months: March, April] Fixed by Admin`;
            await prisma.payment.update({
                where: { id: p.id },
                data: { transactionRef: newRef }
            });
            console.log(`Updated Payment ${p.id} with ref: ${newRef}`);
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

fixPayments();
