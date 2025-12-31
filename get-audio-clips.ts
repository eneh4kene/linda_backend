import { prisma } from './src/lib/prisma';

async function main() {
  const segments = await prisma.storySegment.findMany({
    where: { callId: '27da8bc4-54e6-48d7-a974-5b212d25a533' },
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

  console.log(`\n🎵 AUDIO CLIPS FOR MICHAEL'S LIFEBOOK`);
  console.log(`=====================================\n`);

  segments.forEach((segment, index) => {
    const durationSec = ((segment.endTimeMs - segment.startTimeMs) / 1000).toFixed(1);

    console.log(`\n📖 Segment ${index + 1}: ${segment.category.toUpperCase()}`);
    console.log(`   Quality Score: ${segment.storyQualityScore}/1.0`);
    console.log(`   Emotional Tone: ${segment.emotionalTone}`);
    console.log(`   Duration: ${durationSec} seconds`);
    console.log(`   Time Range: ${(segment.startTimeMs / 1000).toFixed(1)}s - ${(segment.endTimeMs / 1000).toFixed(1)}s`);
    console.log(`   Story: "${segment.transcriptText}"`);
    console.log(`   Status: ${segment.audioClipStatus}`);
    console.log(`\n   🔊 Audio URL:`);
    console.log(`   ${segment.audioClipUrl || 'Not available'}`);
    console.log(`   ───────────────────────────────────────────────────────────`);
  });

  console.log(`\n✅ Total clips available: ${segments.length}`);
  console.log(`\nYou can download and play these clips directly from the URLs above.\n`);

  await prisma.$disconnect();
  process.exit(0);
}

main();
