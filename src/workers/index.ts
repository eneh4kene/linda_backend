import { Worker } from 'bullmq';
import { redis } from '../lib/redis';
import { processCall } from './processCall';
import { extractAudioClip } from './segmentAudio';
import { ProcessCallJobData, ExtractAudioClipJobData } from '../queues';

console.log('🔧 Starting Linda Worker...\n');

// Create worker for call processing queue
const callWorker = new Worker(
  'calls',
  async (job) => {
    console.log(`\n[Worker] Processing job: ${job.name} (${job.id})`);

    try {
      switch (job.name) {
        case 'process-call': {
          const data = job.data as ProcessCallJobData;
          await processCall(data.callId);
          break;
        }

        case 'extract-audio-clip': {
          const data = job.data as ExtractAudioClipJobData;
          await extractAudioClip(data.segmentId);
          break;
        }

        default:
          console.warn(`Unknown job type: ${job.name}`);
      }

      console.log(`[Worker] ✅ Completed job: ${job.name} (${job.id})\n`);
    } catch (error) {
      console.error(`[Worker] ❌ Failed job: ${job.name} (${job.id})`);
      console.error(error);
      throw error; // Re-throw to mark job as failed
    }
  },
  {
    connection: redis,
    concurrency: 5, // Process up to 5 jobs concurrently
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  }
);

// Worker event handlers
callWorker.on('ready', () => {
  console.log('✅ Worker ready and waiting for jobs');
});

callWorker.on('active', (job) => {
  console.log(`⚙️  Job started: ${job.name} (${job.id})`);
});

callWorker.on('completed', (job) => {
  console.log(`✅ Job completed: ${job.name} (${job.id})`);
});

callWorker.on('failed', (job, err) => {
  console.error(`❌ Job failed: ${job?.name} (${job?.id})`);
  console.error(`Error: ${err.message}`);
});

callWorker.on('error', (err) => {
  console.error('Worker error:', err);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n🛑 SIGTERM received, shutting down worker...');
  await callWorker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n🛑 SIGINT received, shutting down worker...');
  await callWorker.close();
  process.exit(0);
});

console.log('\n📋 Worker configuration:');
console.log(`   - Queue: calls`);
console.log(`   - Concurrency: 5`);
console.log(`   - Jobs: process-call, extract-audio-clip\n`);
