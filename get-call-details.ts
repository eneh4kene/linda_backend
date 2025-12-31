import { prisma } from './src/lib/prisma';

const CALL_ID = 'd6ae076b-c3f5-4204-831c-f7e17119f610';

async function main() {
  // Get call details
  const call = await prisma.call.findUnique({
    where: { id: CALL_ID },
    select: {
      id: true,
      status: true,
      durationSeconds: true,
      transcriptText: true,
      startedAt: true,
      endedAt: true,
    },
  });

  if (!call) {
    console.log('❌ Call not found');
    process.exit(1);
  }

  console.log(`\n📞 CALL DETAILS`);
  console.log(`=====================================`);
  console.log(`Call ID: ${call.id}`);
  console.log(`Status: ${call.status}`);
  console.log(`Duration: ${call.durationSeconds} seconds`);
  console.log(`Started: ${call.startedAt}`);
  console.log(`Ended: ${call.endedAt}`);

  // Get segments
  const segments = await prisma.storySegment.findMany({
    where: { callId: CALL_ID },
    select: {
      id: true,
      category: true,
      emotionalTone: true,
      storyQualityScore: true,
      transcriptText: true,
      startTimeMs: true,
      endTimeMs: true,
      audioClipUrl: true,
      audioClipStatus: true,
    },
    orderBy: { storyQualityScore: 'desc' },
  });

  console.log(`\n\n📖 STORY SEGMENTS (${segments.length} total)`);
  console.log(`=====================================\n`);

  segments.forEach((segment, index) => {
    const durationSec = ((segment.endTimeMs - segment.startTimeMs) / 1000).toFixed(1);
    const stars = '⭐'.repeat(Math.ceil(segment.storyQualityScore * 5));

    console.log(`\n${index + 1}. ${segment.category.toUpperCase()} ${stars}`);
    console.log(`   Quality: ${segment.storyQualityScore}/1.0`);
    console.log(`   Tone: ${segment.emotionalTone}`);
    console.log(`   Duration: ${durationSec}s`);
    console.log(`   Time: ${(segment.startTimeMs / 1000).toFixed(1)}s - ${(segment.endTimeMs / 1000).toFixed(1)}s`);
    console.log(`   Story: "${segment.transcriptText.substring(0, 100)}${segment.transcriptText.length > 100 ? '...' : ''}"`);
    console.log(`   Audio Status: ${segment.audioClipStatus}`);

    if (segment.audioClipUrl) {
      console.log(`\n   🔊 AUDIO CLIP:`);
      console.log(`   ${segment.audioClipUrl}`);
    } else {
      console.log(`   ⏳ Audio: ${segment.audioClipStatus}`);
    }
    console.log(`   ─────────────────────────────────────────────────`);
  });

  // Get memories
  const memories = await prisma.memory.findMany({
    where: { sourceCallId: CALL_ID },
    select: {
      category: true,
      key: true,
      value: true,
      confidence: true,
    },
    orderBy: { confidence: 'desc' },
  });

  console.log(`\n\n🧠 MEMORIES EXTRACTED (${memories.length} total)`);
  console.log(`=====================================\n`);

  memories.forEach((memory) => {
    console.log(`• ${memory.category}/${memory.key}: ${memory.value} (${(memory.confidence * 100).toFixed(0)}% confidence)`);
  });

  console.log(`\n✅ Processing complete!\n`);

  await prisma.$disconnect();
  process.exit(0);
}

main();
