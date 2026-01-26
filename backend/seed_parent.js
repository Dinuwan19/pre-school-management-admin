const prisma = require('./src/config/prisma');

async function seedParent() {
    try {
        console.log('Seeding Test Parent...');

        // 1. Create a dummy parent if not exists
        const parent = await prisma.parent.upsert({
            where: { nationalId: '991234567V' },
            update: {},
            create: {
                parentUniqueId: 'P-TEST-001',
                fullName: 'Test Parent User',
                relationship: 'FATHER',
                nationalId: '991234567V',
                phone: '0771234567',
                email: 'parent@test.com', // KEY for signup
                address: '123 Test Street, Colombo',
                status: 'ACTIVE'
            }
        });

        console.log('✅ Test Parent Created/Found:');
        console.log(`   - NIC: ${parent.nationalId}`);
        console.log(`   - Email: ${parent.email}`);
        console.log(`   - Phone: ${parent.phone}`);

        // 2. Ensure they have a linked student to see data
        const classroom = await prisma.classroom.findFirst();
        if (classroom) {
            await prisma.student.create({
                data: {
                    studentUniqueId: 'ST-TEST-001',
                    fullName: 'Baby Test',
                    classroomId: classroom.id,
                    parentId: parent.id,
                    status: 'ACTIVE',
                    dateOfBirth: new Date()
                }
            });
            console.log('✅ Linked "Baby Test" student to this parent.');
        }

        console.log('\n--- HOW TO LOG IN ---');
        console.log('1. Open Parent App');
        console.log('2. Click "Sign Up"');
        console.log('3. Enter NIC: 991234567V');
        console.log('4. Enter Email: parent@test.com');
        console.log('5. Set your own username/password (e.g. parent1 / pass123)');
        console.log('---------------------');

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

seedParent();
