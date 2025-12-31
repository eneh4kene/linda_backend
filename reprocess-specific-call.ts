import { queueProcessCall } from './src/queues';

const callId = 'd383a10c-5305-4be1-8515-3323f43640a1';

queueProcessCall(callId)
  .then(() => {
    console.log(`✅ Queued call ${callId} for reprocessing`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
