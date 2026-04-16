const { PrismaClient } = require('@prisma/client');
const { sendPushNotification } = require('./src/utils/push.utils');
const prisma = new PrismaClient();

async function testPushNotifications() {
  console.log('--- START PUSH NOTIFICATION DIAGNOSTIC ---');
  try {
    const users = await prisma.user.findMany({ 
        where: { role: 'PARENT' },
        select: { id: true, fullName: true, pushToken: true } 
    });
    
    const usersWithTokens = users.filter(u => u.pushToken);
    
    console.log(`Found ${usersWithTokens.length} PARENT users with push tokens out of ${users.length} total.`);
    usersWithTokens.forEach(u => console.log(`User: ${u.fullName || 'Unknown'} (ID: ${u.id}) -> Token: ${u.pushToken}`));

    if (usersWithTokens.length > 0) {
      console.log('\n--- ATTEMPTING TO SEND TEST PUSH ---');
      const tokens = usersWithTokens.map(u => u.pushToken);
      const result = await sendPushNotification(tokens, "Test Notification", "This is an automated diagnostic test from backend \uD83D\uDE80", { action: 'test' });
      console.log('Expo Push API Response:', JSON.stringify(result, null, 2));
    } else {
      console.log('\nERROR: Cannot test pushing because NO parent has a push token registered in the DB!');
    }
  } catch (error) {
    console.error('Fatal Diagnostic Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPushNotifications();
