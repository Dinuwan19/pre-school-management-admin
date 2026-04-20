const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTokens() {
  try {
    const parentsWithTokens = await prisma.user.findMany({
      where: {
        role: 'PARENT',
        pushToken: { not: null }
      },
      select: {
        username: true,
        pushToken: true,
        fullName: true
      }
    });

    console.log('\n--- PUSH TOKEN DIAGNOSTIC ---');
    console.log(`Total Parents with Push Tokens: ${parentsWithTokens.length}`);
    
    if (parentsWithTokens.length > 0) {
      console.log('\nDetails:');
      parentsWithTokens.forEach(p => {
        console.log(`- User: ${p.username} (${p.fullName})`);
        console.log(`  Token: ${p.pushToken ? p.pushToken.substring(0, 30) : 'null'}...`);
      });
    } else {
      console.log('\n❌ WARNING: No parents found with push tokens in the database.');
      console.log('This means the phones are NOT successfully sending their tokens to the server.');
    }
    console.log('-----------------------------\n');

  } catch (error) {
    console.error('Error running diagnostic:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTokens();
