/**
 * Seed script to create persistent test data for development and E2E testing
 * Run with: npx tsx scripts/seed-test-data.ts
 */

import { setupTestData } from '../src/tests/setup';
import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('🌱 Seeding test data...\n');

  try {
    const testData = await setupTestData();

    console.log('✅ Test data created successfully!\n');
    console.log('Test Users:');
    console.log('  - ADMIN:   admin@linda.com (password: TestPassword123!)');
    console.log('  - MANAGER: manager@sunnymeadows.com (password: TestPassword123!)');
    console.log('  - STAFF:   staff@sunnymeadows.com (password: TestPassword123!)');
    console.log('\nTest Facilities:');
    console.log(`  - ${testData.facility1.name} (ID: ${testData.facility1.id})`);
    console.log(`  - ${testData.facility2.name} (ID: ${testData.facility2.id})`);
    console.log('\nTest Resident:');
    console.log(`  - ${testData.resident.firstName} ${testData.resident.lastName}`);
    console.log(`    Family: ${testData.familyMember.firstName} ${testData.familyMember.lastName} (${testData.familyMember.relationship})`);
    console.log('\n✨ You can now run dashboard E2E tests or use these credentials to login!');
  } catch (error) {
    console.error('❌ Error seeding test data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
