import { prisma } from './src/lib/prisma';
import { queueExtractAudioClip } from './src/queues';

const CALL_ID = 'd6ae076b-c3f5-4204-831c-f7e17119f610';

async function main() {
  // Get all segments from this call
  const segments = await prisma.storySegment.findMany({
    where: { callId: CALL_ID },
    select: {
      id: true,
      category: true,
      audioClipStatus: true,
      storyQualityScore: true,
    },
    orderBy: { storyQualityScore: 'desc' },
  });

  console.log(`\n🔄 Requeuing audio extraction for ${segments.length} segments\n`);

  for (const segment of segments) {
    console.log(`Requeuing: ${segment.id} (${segment.category}, quality: ${segment.storyQualityScore})`);

    // Reset status to pending
    await prisma.storySegment.update({
      where: { id: segment.id },
      data: { audioClipStatus: 'pending' },
    });

    // Queue for extraction
    await queueExtractAudioClip(segment.id);
  }

  console.log(`\n✅ All segments queued for reprocessing!\n`);

  await prisma.$disconnect();
  process.exit(0);
}

main();
