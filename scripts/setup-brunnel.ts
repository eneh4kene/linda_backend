import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setupBrunnel() {
  console.log('🏥 Setting up Brunnel Care Homes...\n');

  // 1. Create Brunnel facility
  const facility = await prisma.facility.upsert({
    where: { id: 'brunnel-001' },
    update: {},
    create: {
      id: 'brunnel-001',
      name: 'Brunnel Care Homes',
      phone: '+44 1234 567890', // Update with real phone
      timezone: 'Europe/London',
      settings: {
        callSchedule: {
          defaultTime: '14:00',
          excludeDays: [0, 6], // Exclude Sundays and Saturdays
        },
        familyCheckIns: {
          enabled: true,
          frequency: 'weekly',
        },
      },
    },
  });

  console.log('✅ Created facility:', facility.name);

  // 2. Clean up any existing test/seed data
  console.log('\n🧹 Cleaning up test data...');

  // Delete test residents (but keep real ones)
  const deletedResidents = await prisma.resident.deleteMany({
    where: {
      OR: [
        { id: { startsWith: 'seed-' } },
        { id: { startsWith: 'test-' } },
      ],
    },
  });

  console.log(`✅ Deleted ${deletedResidents.count} test residents`);

  // 3. Show current state
  const residentCount = await prisma.resident.count({
    where: { facilityId: facility.id },
  });

  const callCount = await prisma.call.count();
  const familyCount = await prisma.familyMember.count();

  console.log('\n📊 Current Database State:');
  console.log(`   Facilities: 1 (${facility.name})`);
  console.log(`   Residents: ${residentCount}`);
  console.log(`   Family Members: ${familyCount}`);
  console.log(`   Calls: ${callCount}`);

  console.log('\n✨ Brunnel Care Homes is ready!');
  console.log(`   Facility ID: ${facility.id}`);
  console.log('\nNext steps:');
  console.log('1. Add residents through the dashboard at http://localhost:3001/residents');
  console.log('2. Add family members for each resident');
  console.log('3. Update facility phone number and settings as needed');
}

setupBrunnel()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
