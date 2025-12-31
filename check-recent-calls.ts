import { prisma } from './src/lib/prisma';

async function main() {
  const calls = await prisma.call.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      status: true,
      durationSeconds: true,
      createdAt: true,
      _count: {
        select: {
          segments: true,
        },
      },
    },
  });

  console.log('\n📞 RECENT CALLS');
  console.log('=====================================\n');

  calls.forEach((call, i) => {
    console.log(`${i + 1}. ${call.id.substring(0, 8)}...`);
    console.log(`   Status: ${call.status}`);
    console.log(`   Duration: ${call.durationSeconds}s`);
    console.log(`   Segments: ${call._count.segments}`);
    console.log(`   Created: ${call.createdAt}`);
    console.log('');
  });

  await prisma.$disconnect();
  process.exit(0);
}

main();
