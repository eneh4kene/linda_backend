import { prisma } from './src/lib/prisma';

async function main() {
  const call = await prisma.call.findUnique({
    where: { id: '27da8bc4-54e6-48d7-a974-5b212d25a533' },
    select: {
      id: true,
      transcriptText: true,
      transcript: true,
      durationSeconds: true,
    },
  });

  if (!call) {
    console.log('Call not found');
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log(`Call duration: ${call.durationSeconds} seconds`);
  console.log(`\n=== TRANSCRIPT TEXT ===`);
  console.log(call.transcriptText);
  console.log(`\n=== RAW TRANSCRIPT ===`);
  console.log(JSON.stringify(call.transcript, null, 2));

  await prisma.$disconnect();
  process.exit(0);
}

main();
