/**
 * Test post-call analysis with a realistic sample transcript
 */

import { prisma } from './src/lib/prisma';
import { processCall } from './src/services/postCallAnalysis';

const SAMPLE_TRANSCRIPT = `Linda: Hello Margaret! How are you doing today?

Margaret: Oh hello dear. I'm doing alright, though I've been feeling a bit tired this morning.

Linda: I'm sorry to hear you're tired. Did you not sleep well last night?

Margaret: Not particularly, no. I kept waking up. But that's just how it goes sometimes at my age, isn't it?

Linda: That must be frustrating. Is there anything that helps when you have trouble sleeping?

Margaret: Sometimes I think about the old days. Remembering happy times. Like when Arthur and I used to go dancing at the Rialto on Saturday nights. Oh, those were wonderful evenings.

Linda: That sounds lovely! Tell me more about those Saturday nights at the Rialto.

Margaret: Well, Arthur was such a wonderful dancer. We met there actually, back in 1952. He asked me to dance and I was so nervous! But he was so kind and patient with me. We danced to all the big band music - Glenn Miller, Tommy Dorsey.

Linda: What a beautiful memory. What song were you dancing to when you met?

Margaret: Oh, it was "Moonlight Serenade"! I can still hear it in my mind. Arthur always said that was our song. We played it at our wedding too, three years later in 1955.

Linda: That's so romantic. Do you still think about Arthur often?

Margaret: Every day, dear. Every single day. He passed away ten years ago now, but I still talk to him sometimes. Is that silly?

Linda: Not at all, Margaret. It sounds like you had a wonderful relationship.

Margaret: We did. Fifty-eight years together. Susan, my daughter, she visits on Sundays usually. She's been so good to me. Though last week she had to cancel because little Emma was poorly with a cold.

Linda: I hope Emma is feeling better now. How old is Emma?

Margaret: She's seven now. Such a bright little thing. Loves her books, just like I did at her age. Susan says she might visit this Sunday instead. I do hope she can make it.

Linda: It sounds like you're looking forward to seeing them. Is there anything special you'd like to do when they visit?

Margaret: Oh, I just love hearing about what Emma's been learning at school. And Susan always brings me updates about the garden. I used to love gardening, you know. Had the most beautiful roses.

Linda: Roses! What was your favorite variety?

Margaret: Peace roses. Big, yellow blooms with pink edges. Arthur planted a whole row of them for me one year for my birthday. Said they reminded him of me - beautiful and a bit thorny!

Linda: *laughs* That's wonderful! He sounds like he had a good sense of humor.

Margaret: Oh he did! Always making me laugh, even when I was cross with him. Which wasn't often, mind you. He was a good man.

Linda: You've shared some beautiful memories today, Margaret. Thank you for telling me about Arthur and the Rialto.

Margaret: Thank you for listening, dear. It's nice to remember the happy times.

Linda: Before I let you go, is there anything else on your mind today?

Margaret: No, I think that's all. Though I should probably have a little rest now. All this talking has made me even more tired!

Linda: That sounds like a good idea. Rest well, Margaret. I'll talk to you again soon.

Margaret: Thank you, dear. Goodbye.

Linda: Goodbye, Margaret.`;

async function testWithSampleTranscript() {
  console.log('🧪 Testing Post-Call Analysis with Sample Transcript\n');

  try {
    // Find or create a test call
    const resident = await prisma.resident.findFirst({
      where: { firstName: 'Margaret' },
      include: { facility: true },
    });

    if (!resident) {
      console.log('❌ No test resident found');
      return;
    }

    console.log(`✅ Using resident: ${resident.firstName} ${resident.lastName || ''}`);

    // Create a test call with the sample transcript
    const call = await prisma.call.create({
      data: {
        residentId: resident.id,
        callNumber: 999,
        status: 'completed',
        direction: 'OUTBOUND',
        startedAt: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
        endedAt: new Date(),
        durationSeconds: 900, // 15 minutes
        transcriptText: SAMPLE_TRANSCRIPT,
        transcript: [], // Empty array for now
        processed: false,
      },
    });

    console.log(`✅ Created test call: ${call.id}\n`);

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

      const respondedWellTo = callState.respondedWellTo as string[];
      const didntLand = callState.didntLand as string[];
      const topicsEngaged = callState.topicsEngaged as string[];
      const emotionalPeaks = callState.emotionalPeaks as any[];

      console.log(`   Responded well to: ${respondedWellTo.join(', ')}`);
      console.log(`   Didn't land: ${didntLand.join(', ')}`);
      console.log(`   Topics engaged: ${topicsEngaged.join(', ')}`);

      if (emotionalPeaks.length > 0) {
        console.log('   Emotional peaks:');
        emotionalPeaks.forEach((peak: any) => {
          console.log(`      - ${peak.type}: ${peak.context}`);
        });
      }

      if (callState.notes) {
        console.log(`   Notes: ${callState.notes}`);
      }
      console.log();
    } else {
      console.log('❌ No call state created');
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
        console.log(`      Should ask about: ${event.shouldAskAbout}`);
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
        if (callback.usageNotes) {
          console.log(`      Usage: ${callback.usageNotes}`);
        }
      });
      console.log();
    } else {
      console.log('💬 No callbacks extracted\n');
    }

    // Check resident patterns
    const pattern = await prisma.residentPattern.findUnique({
      where: { residentId: resident.id },
    });

    if (pattern) {
      console.log('🧠 Resident Pattern (aggregated):');
      console.log(`   Typical energy: ${pattern.typicalEnergy}`);
      console.log(`   Typical tone: ${pattern.typicalTone}`);
      console.log(`   Typical receptiveness: ${pattern.typicalReceptiveness}`);
      console.log(`   Usually needs warmup: ${pattern.usuallyNeedsWarmup}`);
      console.log(`   Calls analyzed: ${pattern.callsAnalyzed}`);

      const approachesThatWork = pattern.approachesThatWork as string[];
      const favoriteTopics = pattern.favoriteTopics as string[];
      const conversationalPrefs = pattern.conversationalPreferences as any;

      console.log(`   Approaches that work: ${approachesThatWork.join(', ')}`);
      console.log(`   Favorite topics: ${favoriteTopics.join(', ')}`);

      if (conversationalPrefs) {
        console.log('   Conversational preferences:');
        Object.entries(conversationalPrefs).forEach(([key, value]) => {
          console.log(`      ${key}: ${value}`);
        });
      }

      if (pattern.personalitySummary) {
        console.log(`\n   Personality Summary:`);
        console.log(`   ${pattern.personalitySummary}`);
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
    console.log(`\n💡 Test call ID: ${call.id}`);
    console.log(`   You can clean up with: npx tsx -e "import {prisma} from './src/lib/prisma'; prisma.call.delete({where:{id:'${call.id}'}}).then(() => prisma.$disconnect())"`);
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
testWithSampleTranscript().catch(console.error);
