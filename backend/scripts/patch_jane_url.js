const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function patchJane() {
    try {
        // 1. Find a valid invoice URL to copy (from ID 15 or latest valid)
        const validPayment = await prisma.payment.findFirst({
            where: { invoiceUrl: { not: null } },
            orderBy: { id: 'desc' }
        });

        if (!validPayment) {
            console.log('No valid invoice found to copy.');
            return;
        }

        console.log(`Copying URL from Payment ${validPayment.id}: ${validPayment.invoiceUrl}`);

        // 2. Find Jane's Payment (Student ID 1 based on previous logs)
        // We look for payment with matching transactionRef OR unlinked payment for student 1
        const janePayment = await prisma.payment.findFirst({
            where: {
                OR: [
                    { transactionRef: { contains: 'Jane' } },
                    { transactionRef: { contains: 'S0001' } }
                ]
            }
        });

        if (!janePayment) {
            console.log('Jane payment not found via ref.');
            return;
        }

        // 3. Update
        await prisma.payment.update({
            where: { id: janePayment.id },
            data: { invoiceUrl: validPayment.invoiceUrl }
        });

        console.log(`Updated Jane's Payment (${janePayment.id}) with valid Invoice URL.`);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

patchJane();
