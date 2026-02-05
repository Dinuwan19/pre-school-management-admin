const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkStudent1() {
    try {
        console.log('--- Checking Student 1 (Jane?) ---');
        const student = await prisma.student.findUnique({ where: { id: 1 } });
        console.log('Student:', student);

        if (student) {
            // Find payments via Billings
            const payments = await prisma.payment.findMany({
                where: {
                    billingpayment: {
                        some: {
                            billing: { studentId: 1 }
                        }
                    }
                },
                include: { billingpayment: true }
            });
            console.log(`Found ${payments.length} linked payments.`);
            payments.forEach(p => console.log(`[Linked] ID: ${p.id} | Ref: ${p.transactionRef} | URL: ${p.invoiceUrl}`));

            // Find unallocated payments by Ref
            const unallocated = await prisma.payment.findMany({
                where: {
                    transactionRef: { contains: student.studentUniqueId }
                }
            });
            console.log(`Found ${unallocated.length} unallocated payments via Ref match.`);
            unallocated.forEach(p => console.log(`[RefMatch] ID: ${p.id} | Ref: ${p.transactionRef} | URL: ${p.invoiceUrl}`));
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
checkStudent1();
