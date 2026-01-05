import { prisma } from './src/lib/prisma';

async function testFamilyCheckIn() {
  console.log('🧪 Testing Family Check-In Flow\n');

  try {
    // 1. Find or create a test resident
    console.log('1️⃣  Setting up test resident...');

    let resident = await prisma.resident.findFirst({
      where: { firstName: 'Margaret' },
    });

    if (!resident) {
      console.log('  No test resident found. Skipping test.');
      return;
    }

    console.log(`  ✅ Found resident: ${resident.firstName} ${resident.lastName} (${resident.id})`);

    // 2. Enable family check-in consent if not already enabled
    if (!resident.familyCheckInConsent) {
      console.log('  📝 Enabling family check-in consent...');
      resident = await prisma.resident.update({
        where: { id: resident.id },
        data: {
          familyCheckInConsent: true,
          familyCheckInConsentDate: new Date(),
        },
      });
      console.log('  ✅ Consent enabled');
    } else {
      console.log('  ✅ Consent already enabled');
    }

    // 3. Create a test family member
    console.log('\n2️⃣  Creating test family member...');

    const testPhone = '+15555551234';

    // Delete existing test family member if exists
    const existing = await prisma.familyMember.findUnique({
      where: { phoneNumber: testPhone },
    });

    if (existing) {
      console.log('  🗑️  Deleting existing test family member...');
      await prisma.familyMember.delete({
        where: { id: existing.id },
      });
    }

    const familyMember = await prisma.familyMember.create({
      data: {
        residentId: resident.id,
        firstName: 'Sarah',
        lastName: 'Thompson',
        relationship: 'daughter',
        phoneNumber: testPhone,
        email: 'sarah.thompson@example.com',
        canReceiveCheckIns: true,
        canAccessStarred: true,
      },
    });

    console.log(`  ✅ Created family member: ${familyMember.firstName} ${familyMember.lastName}`);
    console.log(`     Relationship: ${familyMember.relationship}`);
    console.log(`     Phone: ${familyMember.phoneNumber}`);
    console.log(`     Can receive check-ins: ${familyMember.canReceiveCheckIns}`);

    // 4. Simulate a family check-in call
    console.log('\n3️⃣  Simulating family check-in call...');

    const response = await fetch('http://localhost:3000/api/family-checkins/retell', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from_number: testPhone,
        call_id: `test-call-${Date.now()}`,
      }),
    });

    if (!response.ok) {
      console.error(`  ❌ API call failed: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error('  Error:', errorText);
      return;
    }

    const result = await response.json();
    console.log('  ✅ API call successful');

    // 5. Display the generated script
    console.log('\n4️⃣  Generated Check-In Script:\n');
    console.log('━'.repeat(80));

    const dynamicVars = result.call_inbound?.dynamic_variables;
    if (dynamicVars?.script) {
      console.log(dynamicVars.script);
      console.log('━'.repeat(80));
      console.log(`\n  Caller: ${dynamicVars.caller_name}`);
      console.log(`  Resident: ${dynamicVars.resident_name}`);
      console.log(`  Mood: ${dynamicVars.mood_summary}`);
      console.log(`  Topics: ${dynamicVars.topics}`);
    } else {
      console.log('  ⚠️  No script generated');
      console.log('  Response:', JSON.stringify(result, null, 2));
    }

    // 6. Fetch the created check-in record
    console.log('\n5️⃣  Fetching check-in record...');

    const checkIns = await prisma.familyCheckIn.findMany({
      where: { familyMemberId: familyMember.id },
      orderBy: { createdAt: 'desc' },
      take: 1,
      include: {
        resident: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (checkIns.length > 0) {
      const checkIn = checkIns[0];
      console.log('  ✅ Check-in record found:');
      console.log(`     ID: ${checkIn.id}`);
      console.log(`     Status: ${checkIn.status}`);
      console.log(`     Created: ${checkIn.createdAt}`);
      console.log(`     Mood: ${checkIn.moodSummary}`);
      console.log(`     Topics: ${JSON.stringify(checkIn.topicsDiscussed)}`);
      console.log(`     Concerns: ${JSON.stringify(checkIn.concernsRaised)}`);
      console.log(`     Starred moments: ${(checkIn.starredMoments as any[])?.length || 0}`);
      console.log(`     Model: ${checkIn.generationModel}`);
      console.log(`     Tokens: ${checkIn.generationTokens}`);
    } else {
      console.log('  ⚠️  No check-in record found');
    }

    console.log('\n✅ Family Check-In Test Complete!\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFamilyCheckIn();
