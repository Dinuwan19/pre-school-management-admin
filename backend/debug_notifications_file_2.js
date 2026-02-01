const fs = require('fs');
const prisma = require('./src/config/prisma');

async function main() {
    let output = '';

    output += '--- Checking Last 5 Notifications ---\n';
    const notifications = await prisma.notification.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            title: true,
            targetRole: true,
            targetParentId: true,
            targetClassroomId: true, // Checking this!
            createdById: true
        }
    });

    notifications.forEach(n => {
        output += `[ID: ${n.id}] Title: ${n.title}, Role: ${n.targetRole}, TargetParentID: ${n.targetParentId}, TargetClassRoomID: ${n.targetClassroomId}\n`;
    });

    output += '\n--- Checking ALL Parents ---\n';
    const parents = await prisma.parent.findMany({
        include: { user: true }
    });
    parents.forEach(p => {
        output += `Name: ${p.fullName}, ParentID: ${p.id}, UserID: ${p.userId}, Username: ${p.user?.username}\n`;
    });

    fs.writeFileSync('debug_output_2.txt', output);
    console.log('Done');
}

main()
    .catch(e => {
        fs.writeFileSync('debug_output_2.txt', 'Error: ' + e.message);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
