const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkStudents() {
  const students = await prisma.student.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      fullName: true,
      studentUniqueId: true,
      photoUrl: true,
      qrCode: true
    }
  });
  console.log(JSON.stringify(students, null, 2));
  await prisma.$disconnect();
}

checkStudents();
