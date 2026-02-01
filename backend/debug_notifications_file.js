const fs = require('fs');
const prisma = require('./src/config/prisma');

async function main() {
    let output = '';

    output += '--- Checking Last 5 Notifications ---\n';
    const notifications = await prisma.notification.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
            user_notification_targetParentIdTouser: true
        }
    });

    notifications.forEach(n => {
        output += `[ID: ${n.id}] Title: ${n.title}, Role: ${n.targetRole}, TargetParentID: ${n.targetParentId}\n`;
    });

    output += '\n--- Checking Billing Controller Logic Simulation ---\n';
    // Let's check a billing and its student's parent userId
    const billing = await prisma.billing.findFirst({
        where: { status: 'UNPAID' },
        include: { student: { include: { parent_student_parentIdToparent: true } } }
    });

    if (billing) {
        const parent = billing.student.parent_student_parentIdToparent;
        output += `Test Billing ID: ${billing.id}\n`;
        output += `Student: ${billing.student.fullName}\n`;
        output += `Parent: ${parent?.fullName}\n`;
        output += `Parent UserID: ${parent?.userId}\n`;
    } else {
        output += 'No UNPAID billing found to test.\n';
    }

    fs.writeFileSync('debug_output.txt', output);
    console.log('Debug output written to debug_output.txt');
}

main()
    .catch(e => {
        fs.writeFileSync('debug_output.txt', 'Error: ' + e.message);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
