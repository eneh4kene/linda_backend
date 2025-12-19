import { Queue } from 'bullmq';
import { redis } from '../lib/redis';

// Queue for call processing jobs
export const callQueue = new Queue('calls', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      count: 100, // Keep last 100 completed jobs
    },
    removeOnFail: {
      count: 500, // Keep last 500 failed jobs for debugging
    },
  },
});

// Job type definitions for type safety
export interface ProcessCallJobData {
  callId: string;
}

export interface ExtractAudioClipJobData {
  segmentId: string;
}

export interface ScheduledCallsJobData {
  // Empty - triggered by cron
}

/**
 * Add a process-call job to the queue
 */
export async function queueProcessCall(callId: string) {
  return callQueue.add('process-call', { callId } as ProcessCallJobData, {
    priority: 1,
  });
}

/**
 * Add an extract-audio-clip job to the queue
 */
export async function queueExtractAudioClip(segmentId: string) {
  return callQueue.add('extract-audio-clip', { segmentId } as ExtractAudioClipJobData, {
    priority: 2,
  });
}

/**
 * Add a scheduled-calls job to the queue
 */
export async function queueScheduledCalls() {
  return callQueue.add('scheduled-calls', {} as ScheduledCallsJobData, {
    priority: 3,
  });
}
