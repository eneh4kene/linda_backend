/**
 * Test script for post-call analysis pipeline
 *
 * This script tests the Memory Layer Phase 1 implementation by:
 * 1. Finding a completed call with transcript
 * 2. Running the post-call analysis
 * 3. Verifying the extracted data
 */

import { processCall } from './src/services/postCallAnalysis';
import { prisma } from './src/lib/prisma';

async function testPostCallAnalysis() {
  console.log('🧪 Testing Post-Call Analysis Pipeline\n');

  try {
    // Find a completed call with transcript
    const call = await prisma.call.findFirst({
      where: {
        status: 'completed',
        transcriptText: { not: null },
        processed: false, // Find unprocessed calls
      },
      orderBy: { createdAt: 'desc' },
      include: {
        resident: {
          include: {
            facility: true,
          },
        },
      },
    });

    if (!call) {
      console.log('❌ No suitable call found for testing');
      console.log('   Need a completed call with transcript');

      // Show what calls are available
      const totalCalls = await prisma.call.count();
      const completedCalls = await prisma.call.count({ where: { status: 'completed' } });
      const callsWithTranscript = await prisma.call.count({
        where: { transcriptText: { not: null } }
      });

      console.log(`\n📊 Database stats:`);
      console.log(`   Total calls: ${totalCalls}`);
      console.log(`   Completed calls: ${completedCalls}`);
      console.log(`   Calls with transcript: ${callsWithTranscript}`);

      return;
    }

    console.log('✅ Found test call:');
    console.log(`   Call ID: ${call.id}`);
    console.log(`   Resident: ${call.resident.firstName} ${call.resident.lastName || ''}`);
    console.log(`   Duration: ${call.durationSeconds}s`);
    console.log(`   Transcript length: ${call.transcriptText?.length} characters`);
    console.log();

    // Run the analysis
    console.log('🔄 Running post-call analysis...\n');
    await processCall(call.id);

    // Verify the results
    console.log('\n✅ Analysis complete! Checking extracted data...\n');

    // Check call state
    const callState = await prisma.callState.findUnique({
      where: { callId: call.id },
    });

    if (callState) {
      console.log('📊 Call State:');
      console.log(`   Energy: ${callState.energyLevel}`);
      console.log(`   Tone: ${callState.emotionalTone}`);
      console.log(`   Receptiveness: ${callState.receptiveness}`);
      console.log(`   Warmup observed: ${callState.warmupObserved}`);
      console.log(`   Responded well to: ${JSON.stringify(callState.respondedWellTo)}`);
      console.log(`   Didn't land: ${JSON.stringify(callState.didntLand)}`);
      console.log(`   Topics engaged: ${JSON.stringify(callState.topicsEngaged)}`);
      console.log();
    } else {
      console.log('⚠️  No call state created');
    }

    // Check anticipated events
    const events = await prisma.anticipatedEvent.findMany({
      where: { sourceCallId: call.id },
    });

    if (events.length > 0) {
      console.log(`📅 Anticipated Events (${events.length}):`);
      events.forEach((event, i) => {
        console.log(`   ${i + 1}. [${event.eventType}] ${event.description}`);
        if (event.eventDate) {
          console.log(`      Date: ${event.eventDate.toISOString().split('T')[0]}`);
        }
        console.log(`      Emotional tone: ${event.emotionalTone}`);
      });
      console.log();
    } else {
      console.log('📅 No anticipated events extracted\n');
    }

    // Check callbacks
    const callbacks = await prisma.callback.findMany({
      where: { sourceCallId: call.id },
    });

    if (callbacks.length > 0) {
      console.log(`💬 Callbacks (${callbacks.length}):`);
      callbacks.forEach((callback, i) => {
        console.log(`   ${i + 1}. [${callback.callbackType}] ${callback.content}`);
        if (callback.context) {
          console.log(`      Context: ${callback.context}`);
        }
      });
      console.log();
    } else {
      console.log('💬 No callbacks extracted\n');
    }

    // Check resident patterns
    const pattern = await prisma.residentPattern.findUnique({
      where: { residentId: call.residentId },
    });

    if (pattern) {
      console.log('🧠 Resident Pattern (aggregated):');
      console.log(`   Typical energy: ${pattern.typicalEnergy}`);
      console.log(`   Typical tone: ${pattern.typicalTone}`);
      console.log(`   Usually needs warmup: ${pattern.usuallyNeedsWarmup}`);
      console.log(`   Calls analyzed: ${pattern.callsAnalyzed}`);
      console.log(`   Approaches that work: ${JSON.stringify(pattern.approachesThatWork)}`);
      console.log(`   Favorite topics: ${JSON.stringify(pattern.favoriteTopics)}`);
      if (pattern.personalitySummary) {
        console.log(`   Summary: ${pattern.personalitySummary.substring(0, 150)}...`);
      }
      console.log();
    } else {
      console.log('🧠 No resident pattern created (needs 2+ calls)\n');
    }

    // Check if call was marked as processed
    const updatedCall = await prisma.call.findUnique({
      where: { id: call.id },
      select: { processed: true, processedAt: true },
    });

    if (updatedCall?.processed) {
      console.log('✅ Call marked as processed');
      console.log(`   Processed at: ${updatedCall.processedAt?.toISOString()}`);
    } else {
      console.log('⚠️  Call not marked as processed');
    }

    console.log('\n🎉 Test completed successfully!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testPostCallAnalysis().catch(console.error);
