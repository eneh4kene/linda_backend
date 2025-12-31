import { prisma } from './src/lib/prisma';

async function main() {
  const segments = await prisma.storySegment.findMany({
    where: { callId: '27da8bc4-54e6-48d7-a974-5b212d25a533' },
    select: {
      id: true,
      category: true,
      storyQualityScore: true,
      audioClipStatus: true,
      transcriptText: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  console.log(`Found ${segments.length} segments for call 27da8bc4-54e6-48d7-a974-5b212d25a533`);
  if (segments.length > 0) {
    console.log(JSON.stringify(segments, null, 2));
  } else {
    console.log('No segments created yet');
  }

  await prisma.$disconnect();
  process.exit(0);
}

main();
