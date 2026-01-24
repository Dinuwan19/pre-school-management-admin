const prisma = require('./src/config/prisma');

async function checkUser() {
    const user = await prisma.user.findUnique({
        where: { username: 'superadmin' }
    });
    console.log('USER DATA:', JSON.stringify(user, null, 2));
    process.exit(0);
}

checkUser().catch(e => {
    console.error(e);
    process.exit(1);
});
