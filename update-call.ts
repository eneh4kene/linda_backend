import { PrismaClient } from '@prisma/client';
import { queueProcessCall } from './src/queues';

const prisma = new PrismaClient();

async function updateAndProcessCall() {
  // The transcript we saw in the webhook logs
  const transcript = `User: Linda.
Agent: Hello Michael, it's Linda calling. How are you today?
User: I'm fine.
Agent: That's good
User: Do you remember our last conversation?
Agent: This is actually our first chat together, Michael. I'm glad to be speaking with you today.How has your day been so far?
User: It's cool. I want you to remember one thing.
Agent: Of course, Michael. What would you like me to remember?
User: Brother's name is Joe.
Agent: Thank you for telling me, Michael. I'll remember your brother's name is Joe.Did you and Joe get up to much together when you were younger?
User: Wait. I see something now. Fuck. Okay?
Agent: Alright, Michael. Take your time. I'm here if you want to talk or if you need a moment.
User: Goodbye.
Agent: It's been lovely chatting with you, Michael. Take care, and I'll give you a ring again soon.
`;

  const call = await prisma.call.update({
    where: { retellCallId: 'call_88723569b374f375814f5fc3a66' },
    data: {
      status: 'completed',
      transcriptText: transcript,
      endedAt: new Date(),
      durationSeconds: 58
    }
  });

  console.log('✅ Updated call:', call.id);
  console.log('   Status:', call.status);

  // Queue for processing
  await queueProcessCall(call.id);
  console.log('✅ Queued for memory extraction');

  await prisma.$disconnect();
  process.exit(0);
}

updateAndProcessCall().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
