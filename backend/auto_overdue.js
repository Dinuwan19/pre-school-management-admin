const prisma = require('./src/config/prisma');

async function main() {
    console.log('[Auto-Overdue] Starting manual sync...');
    try {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonthIndex = now.getMonth();
        const currentDay = now.getDate();

        const unpaidBillings = await prisma.billing.findMany({
            where: { status: 'UNPAID' },
            include: {
                student: { include: { parent_student_parentIdToparent: true } }
            }
        });

        const dayjs = require('dayjs');

        // 1. Mark existing UNPAID as OVERDUE
        const overdueItems = unpaidBillings.filter(bill => {
            const billDate = new Date(bill.createdAt);
            if (billDate.getFullYear() < currentYear || 
                (billDate.getFullYear() === currentYear && billDate.getMonth() < currentMonthIndex)) {
                return true;
            }
            if (billDate.getFullYear() === currentYear && billDate.getMonth() === currentMonthIndex) {
                return currentDay > 10;
            }
            return false;
        });

        console.log(`[Auto-Overdue] Found ${overdueItems.length} existing bills to mark as overdue.`);

        for (const bill of overdueItems) {
            await prisma.billing.update({
                where: { id: bill.id },
                data: { status: 'OVERDUE' }
            });

            const parent = bill.student.parent_student_parentIdToparent;
            if (parent && parent.userId) {
                const existingNote = await prisma.notification.findFirst({
                    where: {
                        targetParentId: parent.userId,
                        billingMonth: bill.billingMonth,
                        title: 'Overdue Payment Reminder'
                    }
                });

                if (!existingNote) {
                    await prisma.notification.create({
                        data: {
                            title: 'Overdue Payment Reminder',
                            message: `The payment for ${bill.billingMonth} for ${bill.student.fullName} is now overdue. Please settle it as soon as possible.`,
                            targetRole: 'PERSONAL',
                            targetParentId: parent.userId,
                            billingMonth: bill.billingMonth,
                            createdById: 1
                        }
                    });
                    console.log(`[Auto-Overdue] Notified parent for ${bill.student.fullName} (Existing Bill)`);
                }
            }
        }

        // 2. PROACTIVE: Find missing bills
        const activeStudents = await prisma.student.findMany({
            where: { status: 'ACTIVE' },
            include: { parent_student_parentIdToparent: true }
        });

        const monthsToCheck = [];
        const prevMonth = dayjs().subtract(1, 'month');
        monthsToCheck.push({ value: prevMonth.format('YYYY-MM'), name: prevMonth.format('MMMM'), date: prevMonth });
        
        if (currentDay > 10) {
            const curr = dayjs();
            monthsToCheck.push({ value: curr.format('YYYY-MM'), name: curr.format('MMMM'), date: curr });
        }

        for (const student of activeStudents) {
            for (const targetMonth of monthsToCheck) {
                const enrollDate = dayjs(student.enrollmentDate).startOf('month');
                if (targetMonth.date.startOf('month').isBefore(enrollDate)) continue;

                const existingBill = await prisma.billing.findFirst({
                    where: {
                        studentId: student.id,
                        categoryId: null,
                        OR: [
                            { billingMonth: { contains: targetMonth.value } },
                            { billingMonth: { contains: targetMonth.name } }
                        ]
                    }
                });

                if (!existingBill) {
                    console.log(`[Auto-Overdue] Auto-generating bill for ${student.fullName} - ${targetMonth.value}`);
                    await prisma.billing.create({
                        data: {
                            studentId: student.id,
                            billingMonth: targetMonth.value,
                            amount: 15000,
                            status: 'OVERDUE',
                            categoryId: null
                        }
                    });

                    const parent = student.parent_student_parentIdToparent;
                    if (parent && parent.userId) {
                        await prisma.notification.create({
                            data: {
                                title: 'Overdue Payment Reminder',
                                message: `Auto-generated: The payment for ${targetMonth.name} for ${student.fullName} is now overdue. Please settle it as soon as possible.`,
                                targetRole: 'PERSONAL',
                                targetParentId: parent.userId,
                                billingMonth: targetMonth.value,
                                createdById: 1
                            }
                        });
                        console.log(`[Auto-Overdue] Notified parent for ${student.fullName} (New Bill)`);
                    }
                }
            }
        }
        console.log('[Auto-Overdue] Sync completed successfully.');
    } catch (error) {
        console.error('[Auto-Overdue] Sync failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
