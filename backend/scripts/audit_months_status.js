const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function auditMonths() {
    try {
        console.log('--- AUDIT: Payments for Student 1 (Jan-May 2026) ---');

        // 1. Get all payments that might be relevant
        const payments = await prisma.payment.findMany({
            where: {
                OR: [
                    { billingpayment: { some: { billing: { studentId: 1 } } } },
                    { transactionRef: { contains: 'S0001' } },
                    { transactionRef: { contains: 'Jane' } }
                ]
            },
            include: { billingpayment: { include: { billing: true } } }
        });

        const targetMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May'];

        targetMonths.forEach(m => {
            console.log(`\nChecking Month: ${m}`);
            const relevant = payments.filter(p => {
                const ref = p.transactionRef || '';
                return ref.includes(m) || ref.includes('Monthly Fee'); // Rough check, refining below
            });

            relevant.forEach(p => {
                // Exact logic check as per frontend
                const ref = p.transactionRef || '';
                const monthMatch = ref.match(/\[Months:\s(.*?)\]/);
                let involvesMonth = false;
                if (monthMatch) {
                    involvesMonth = monthMatch[1].includes(m) || monthMatch[1].includes(getFullMonth(m));
                } else {
                    involvesMonth = ref.includes(m);
                }

                if (involvesMonth) {
                    console.log(`   - ID: ${p.id} | Status: ${p.status} | Ref: "${p.transactionRef}" | Created: ${p.createdAt.toISOString()}`);
                }
            });
        });

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

function getFullMonth(short) {
    const map = { 'Jan': 'January', 'Feb': 'February', 'Mar': 'March', 'Apr': 'April', 'May': 'May' };
    return map[short];
}

auditMonths();
