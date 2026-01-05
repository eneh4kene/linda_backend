import { prisma } from './src/lib/prisma';

async function testUnifiedRouting() {
  console.log('🧪 Testing Unified Call Routing (Resident + Family)\n');
  console.log('='.repeat(80) + '\n');

  try {
    // Setup: Get Margaret Thompson as test resident
    const resident = await prisma.resident.findFirst({
      where: { firstName: 'Margaret' },
    });

    if (!resident) {
      console.log('❌ No test resident found');
      return;
    }

    // Enable family check-in consent if not already
    await prisma.resident.update({
      where: { id: resident.id },
      data: {
        familyCheckInConsent: true,
        familyCheckInConsentDate: new Date(),
      },
    });

    // Setup: Create/update family member
    const testFamilyPhone = '+15555551234';
    const testResidentPhone = '+15555559999';

    // Delete existing test family member
    await prisma.familyMember.deleteMany({
      where: { phoneNumber: testFamilyPhone },
    });

    const familyMember = await prisma.familyMember.create({
      data: {
        residentId: resident.id,
        firstName: 'Sarah',
        lastName: 'Thompson',
        relationship: 'daughter',
        phoneNumber: testFamilyPhone,
        email: 'sarah@example.com',
        canReceiveCheckIns: true,
        canAccessStarred: true,
      },
    });

    console.log('📋 Test Setup Complete:');
    console.log(`   Resident: ${resident.firstName} ${resident.lastName} (${resident.id})`);
    console.log(`   Family Member: ${familyMember.firstName} ${familyMember.lastName} (${familyMember.relationship})`);
    console.log(`   Family Phone: ${testFamilyPhone}`);
    console.log(`   Resident Phone: ${testResidentPhone || 'NOT SET'}\n`);

    // TEST 1: Family Member Call
    console.log('━'.repeat(80));
    console.log('TEST 1: Family Member Check-In Call');
    console.log('━'.repeat(80) + '\n');

    console.log(`📞 Simulating call from family member (${testFamilyPhone})...`);

    const familyCallResponse = await fetch('http://localhost:3000/api/inbound/retell', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from_number: testFamilyPhone,
        call_id: `test-family-${Date.now()}`,
      }),
    });

    if (!familyCallResponse.ok) {
      console.error(`❌ Family call failed: ${familyCallResponse.status}`);
      const error = await familyCallResponse.text();
      console.error(error);
    } else {
      const familyResult = await familyCallResponse.json();
      console.log('✅ Family call routed successfully\n');
      console.log('Response Data:');
      console.log(`  Call Type: ${familyResult.call_inbound?.dynamic_variables?.call_type}`);
      console.log(`  Caller: ${familyResult.call_inbound?.dynamic_variables?.caller_name}`);
      console.log(`  Resident: ${familyResult.call_inbound?.dynamic_variables?.resident_name}`);
      console.log('\n  Script Preview:');
      const script = familyResult.call_inbound?.dynamic_variables?.script || '';
      console.log('  ' + script.split('\n').slice(0, 3).join('\n  '));
    }

    // TEST 2: Resident Call (if phone number is set)
    if (testResidentPhone) {
      console.log('\n' + '━'.repeat(80));
      console.log('TEST 2: Resident Conversation Call');
      console.log('━'.repeat(80) + '\n');

      // Update resident with test phone
      await prisma.resident.update({
        where: { id: resident.id },
        data: { phoneNumber: testResidentPhone },
      });

      console.log(`📞 Simulating call from resident (${testResidentPhone})...`);

      const residentCallResponse = await fetch('http://localhost:3000/api/inbound/retell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_number: testResidentPhone,
          call_id: `test-resident-${Date.now()}`,
        }),
      });

      if (!residentCallResponse.ok) {
        console.error(`❌ Resident call failed: ${residentCallResponse.status}`);
        const error = await residentCallResponse.text();
        console.error(error);
      } else {
        const residentResult = await residentCallResponse.json();
        console.log('✅ Resident call routed successfully\n');
        console.log('Response Data:');
        console.log(`  Call Type: ${residentResult.call_inbound?.dynamic_variables?.call_type}`);
        console.log(`  Preferred Name: ${residentResult.call_inbound?.dynamic_variables?.preferred_name}`);
        console.log(`  System Prompt Length: ${residentResult.call_inbound?.dynamic_variables?.system_prompt?.length || 0} chars`);
      }
    }

    // TEST 3: Unknown Caller
    console.log('\n' + '━'.repeat(80));
    console.log('TEST 3: Unknown Caller');
    console.log('━'.repeat(80) + '\n');

    const unknownPhone = '+15559999999';
    console.log(`📞 Simulating call from unknown number (${unknownPhone})...`);

    const unknownCallResponse = await fetch('http://localhost:3000/api/inbound/retell', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from_number: unknownPhone,
        call_id: `test-unknown-${Date.now()}`,
      }),
    });

    if (!unknownCallResponse.ok) {
      console.error(`❌ Unknown call failed: ${unknownCallResponse.status}`);
    } else {
      const unknownResult = await unknownCallResponse.json();
      console.log('✅ Unknown caller handled gracefully\n');
      console.log('Response:');
      console.log(`  Script: ${unknownResult.call_inbound?.dynamic_variables?.script}`);
    }

    // TEST 4: Check Staff Dashboard
    console.log('\n' + '━'.repeat(80));
    console.log('TEST 4: Staff Dashboard Endpoints');
    console.log('━'.repeat(80) + '\n');

    // Test summary endpoint
    const summaryResponse = await fetch('http://localhost:3000/api/staff/check-ins/summary?days=7');
    if (summaryResponse.ok) {
      const summary = await summaryResponse.json();
      console.log('✅ Check-Ins Summary:');
      console.log(`  Total Check-Ins (last 7 days): ${summary.summary.totalCheckIns}`);
      console.log(`  Completed: ${summary.summary.completed}`);
      console.log(`  With Concerns: ${summary.summary.withConcerns}`);
      console.log(`  Concerns by Severity:`, summary.summary.concernsBySeverity);
    }

    // Test concerns endpoint
    const concernsResponse = await fetch('http://localhost:3000/api/staff/concerns');
    if (concernsResponse.ok) {
      const concerns = await concernsResponse.json();
      console.log(`\n✅ All Concerns: ${concerns.total} found`);
      if (concerns.total > 0) {
        console.log('\n  Example Concern:');
        console.log(`    Type: ${concerns.concerns[0].concern.type}`);
        console.log(`    Severity: ${concerns.concerns[0].concern.severity}`);
        console.log(`    Description: ${concerns.concerns[0].concern.description}`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ All Tests Complete!');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testUnifiedRouting();
