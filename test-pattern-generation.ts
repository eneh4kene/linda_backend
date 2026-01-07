/**
 * Test pattern generation by creating a second call
 * Resident patterns are created when there are 2+ calls
 */

import { prisma } from './src/lib/prisma';
import { processCall as runPostCallAnalysis } from './src/services/postCallAnalysis';
import { getFormattedCallContext } from './src/services/getCallContext';

const SECOND_SAMPLE_TRANSCRIPT = `Linda: Hello Margaret! It's lovely to talk with you again. How have you been?

Margaret: Oh hello Linda, dear. I'm alright, thank you. A bit brighter today than last time we spoke.

Linda: That's wonderful to hear! I'm glad you're feeling brighter. Did you get some good rest?

Margaret: I did actually. I slept much better last night. Susan did visit yesterday after all.

Linda: Oh, that's lovely! And how is little Emma? Is she feeling better from that cold?

Margaret: Yes, she's much better, thank you for asking. She was full of beans yesterday! Couldn't stop chattering about her school project on the Tudors.

Linda: The Tudors! That sounds interesting. Did you help her with it?

Margaret: Well, I told her a few things. My teacher used to talk about them when I was at school. I remember being fascinated by Queen Elizabeth.

Linda: Queen Elizabeth the First! What was it about her that fascinated you?

Margaret: Oh, she was so clever, wasn't she? A woman ruling in a man's world. My mother used to say we should all be a bit more like Good Queen Bess - standing our ground.

Linda: Your mother sounds like she was quite strong-minded herself.

Margaret: She was! Oh yes. She worked in the munitions factory during the war. Rosie the Riveter, she used to joke. Tough as old boots but soft as butter with us children.

Linda: What a wonderful image. Did she tell you stories about working in the factory?

Margaret: All the time. The camaraderie, she'd say. All those women working together, singing while they worked. They'd sing "We'll Meet Again" and "The White Cliffs of Dover." She said it kept their spirits up.

Linda: That must have been during the Second World War. Were you born yet?

Margaret: Just barely! I was born in 1943. So I don't remember the war itself, but I grew up hearing all the stories. The blackouts, the rationing, the Anderson shelter in the garden.

Linda: Did your family keep the Anderson shelter after the war?

Margaret: They did for years! My brothers and I used to play in it. It became our secret den. We'd pretend we were spies or explorers. Drove our mother mad when we'd track mud through the house.

Linda: How many brothers did you have?

Margaret: Two. Michael and Robert. Both older than me. They're both gone now. Michael passed five years ago, Robert just last year.

Linda: I'm sorry to hear that, Margaret.

Margaret: Thank you, dear. It's just the way of things, isn't it? I'm the last one left of my generation in the family. Sometimes feels strange.

Linda: That must feel quite lonely at times.

Margaret: It does. But then I think about Arthur, and my brothers, and all the people I've loved. And Susan and Emma. I'm part of a chain, aren't I? Connecting the past to the future.

Linda: What a beautiful way to think about it. A chain connecting generations.

Margaret: Well, that's what Emma's Tudor project made me think of. All these lives connected through time. Elizabeth to my teacher to me to Emma. Stories passing down.

Linda: Have you told Emma stories about the war? About her great-grandmother?

Margaret: Some. She's very interested in history. I should tell her more. She'd love to hear about the Anderson shelter and the sing-songs in the factory.

Linda: I think she would treasure those stories, coming from you.

Margaret: You're right. I'll make sure to tell her next time. While I still can, eh?

Linda: While you can share them together, yes. That's precious time.

Margaret: It is. You know, Linda, these chats help me remember what's worth talking about. What matters.

Linda: I'm glad, Margaret. I always enjoy our conversations. You have such rich memories.

Margaret: Thank you for listening, dear. Not everyone does anymore.

Linda: I always will. It's been lovely chatting with you today, Margaret. You take care, and give my regards to Susan and Emma.

Margaret: I will. Thank you, Linda. Goodbye.

Linda: Goodbye, Margaret.`;

async function testPatternGeneration() {
  console.log('🧪 Testing Pattern Generation (2+ Calls)\n');

  try {
    // Find the resident
    const resident = await prisma.resident.findFirst({
      where: { firstName: 'Margaret' },
    });

    if (!resident) {
      console.log('❌ No resident found');
      return;
    }

    console.log(`✅ Using resident: ${resident.firstName} ${resident.lastName || ''}`);

    // Check existing call states
    const existingCallStates = await prisma.callState.count({
      where: { residentId: resident.id },
    });

    console.log(`   Existing call states: ${existingCallStates}`);

    if (existingCallStates === 0) {
      console.log('⚠️  No existing call states. Run test-with-sample-transcript.ts first.');
      return;
    }

    // Create second call
    console.log('\n🔄 Creating second test call...');
    const call = await prisma.call.create({
      data: {
        residentId: resident.id,
        callNumber: 1000,
        status: 'completed',
        direction: 'OUTBOUND',
        startedAt: new Date(Date.now() - 12 * 60 * 1000),
        endedAt: new Date(),
        durationSeconds: 720,
        transcriptText: SECOND_SAMPLE_TRANSCRIPT,
        transcript: [],
        processed: false,
      },
    });

    console.log(`✅ Created call: ${call.id}\n`);

    // Run analysis
    console.log('🔄 Running post-call analysis...\n');
    await runPostCallAnalysis(call.id);

    console.log('\n✅ Analysis complete!\n');

    // Check if pattern was created
    const pattern = await prisma.residentPattern.findUnique({
      where: { residentId: resident.id },
    });

    if (pattern) {
      console.log('🎉 RESIDENT PATTERN CREATED!\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('PATTERN DETAILS:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      console.log(`Typical Energy: ${pattern.typicalEnergy}`);
      console.log(`Typical Tone: ${pattern.typicalTone}`);
      console.log(`Typical Receptiveness: ${pattern.typicalReceptiveness}`);
      console.log(`Usually Needs Warmup: ${pattern.usuallyNeedsWarmup}`);
      if (pattern.typicalWarmupMinutes) {
        console.log(`Typical Warmup Minutes: ${pattern.typicalWarmupMinutes}`);
      }
      console.log(`Calls Analyzed: ${pattern.callsAnalyzed}`);
      console.log();

      const approachesThatWork = pattern.approachesThatWork as string[];
      if (approachesThatWork && approachesThatWork.length > 0) {
        console.log('Approaches That Work:');
        approachesThatWork.forEach(a => console.log(`  - ${a}`));
        console.log();
      }

      const favoriteTopics = pattern.favoriteTopics as string[];
      if (favoriteTopics && favoriteTopics.length > 0) {
        console.log('Favorite Topics:');
        favoriteTopics.forEach(t => console.log(`  - ${t}`));
        console.log();
      }

      const conversationalPrefs = pattern.conversationalPreferences as any;
      if (conversationalPrefs && Object.keys(conversationalPrefs).length > 0) {
        console.log('Conversational Preferences:');
        Object.entries(conversationalPrefs).forEach(([key, value]) => {
          console.log(`  ${key}: ${value}`);
        });
        console.log();
      }

      if (pattern.personalitySummary) {
        console.log('Personality Summary:');
        console.log(`  ${pattern.personalitySummary}`);
        console.log();
      }

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    } else {
      console.log('⚠️  No pattern created yet (needs 2+ call states)\n');
    }

    // Test full context
    console.log('🔄 Testing full context with pattern...\n');
    const fullContext = await getFormattedCallContext(resident.id);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('FULL MEMORY CONTEXT (for prompt):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(fullContext);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🎉 Test completed successfully!');
    console.log(`\n💡 Test call ID: ${call.id}`);
    console.log(`   Clean up with: npx tsx -e "import {prisma} from './src/lib/prisma'; prisma.call.delete({where:{id:'${call.id}'}}).then(() => prisma.$disconnect())"`);
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
testPatternGeneration().catch(console.error);
