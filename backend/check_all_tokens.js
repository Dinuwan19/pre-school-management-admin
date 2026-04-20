const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllTokens() {
  try {
    const usersWithTokens = await prisma.user.findMany({
      where: {
        pushToken: { not: null }
      },
      select: {
        username: true,
        role: true,
        pushToken: true
      }
    });

    console.log('\n--- ALL USERS PUSH TOKEN CHECK ---');
    console.log(`Total Users with Push Tokens: ${usersWithTokens.length}`);
    
    usersWithTokens.forEach(u => {
      console.log(`- [${u.role}] ${u.username}: ${u.pushToken.substring(0, 20)}...`);
    });
    console.log('----------------------------------\n');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllTokens();
