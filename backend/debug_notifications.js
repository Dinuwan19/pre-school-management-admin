const prisma = require('./src/config/prisma');

async function main() {
    console.log('--- Checking Last 5 Notifications ---');
    const notifications = await prisma.notification.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            title: true,
            targetRole: true,
            targetParentId: true,
            user_notification_targetParentIdTouser: {
                select: { username: true }
            }
        }
    });

    notifications.forEach(n => {
        console.log(`[ID: ${n.id}] Role: ${n.targetRole}, TargetParentID: ${n.targetParentId} (${n.user_notification_targetParentIdTouser?.username || 'None'})`);
    });

    console.log('\n--- Checking Parents (Sample) ---');
    const parents = await prisma.parent.findMany({
        take: 3,
        include: { user: true }
    });
    parents.forEach(p => {
        console.log(`Parent: ${p.fullName}, ParentID (Table): ${p.id}, UserID (Link): ${p.userId}, Username: ${p.user?.username}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
