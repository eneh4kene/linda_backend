import { queueProcessCall } from './src/queues';

const callId = '27da8bc4-54e6-48d7-a974-5b212d25a533';

queueProcessCall(callId)
  .then(() => {
    console.log(`✅ Queued call ${callId} for reprocessing`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
