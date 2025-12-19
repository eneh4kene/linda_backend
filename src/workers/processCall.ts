import { prisma } from '../lib/prisma';
import { downloadAudio, uploadAudio } from '../services/storage';
import { extractMemories, upsertMemories } from './extractMemories';
import { identifyStorySegments } from './segmentAudio';
import { queueExtractAudioClip } from '../queues';
import { RetellTranscriptEntry } from '../types';

/**
 * Main post-call processing worker
 * Handles:
 * 1. Audio download and storage
 * 2. Memory extraction
 * 3. Story segment identification
 * 4. Queueing audio clip extraction
 */
export async function processCall(callId: string): Promise<void> {
  console.log(`\n========================================`);
  console.log(`Processing call: ${callId}`);
  console.log(`========================================\n`);

  const call = await prisma.call.findUnique({
    where: { id: callId },
    include: {
      resident: true,
    },
  });

  if (!call) {
    throw new Error(`Call not found: ${callId}`);
  }

  // Step 1: Download and store audio permanently in Vercel Blob
  // The webhook stores the Retell recording URL, but we want to save it to our own storage
  if (call.audioUrl && call.audioUrl.includes('retell')) {
    try {
      console.log(`\n--- Downloading and storing audio ---`);
      console.log(`Downloading from Retell: ${call.audioUrl}`);

      const audioBuffer = await downloadAudio(call.audioUrl);
      console.log(`Downloaded ${audioBuffer.length} bytes`);

      const blobUrl = await uploadAudio(callId, audioBuffer);
      console.log(`Uploaded to Vercel Blob: ${blobUrl}`);

      // Update call with Vercel Blob URL
      await prisma.call.update({
        where: { id: callId },
        data: { audioUrl: blobUrl },
      });

      // Update local reference
      call.audioUrl = blobUrl;
      console.log('Audio stored successfully');
    } catch (error) {
      console.error('Error storing audio:', error);
      // Continue processing even if audio storage fails
    }
  }

  // Step 2: Extract memories from transcript
  if (call.transcriptText) {
    console.log(`\n--- Extracting memories ---`);
    const residentName = call.resident.preferredName || call.resident.firstName;

    const memories = await extractMemories(call.residentId, call.transcriptText, residentName);

    if (memories.length > 0) {
      console.log(`Extracted ${memories.length} memories`);
      await upsertMemories(call.residentId, callId, memories);
    } else {
      console.log('No memories extracted from this call');
    }
  }

  // Step 3: Identify story segments
  if (call.transcript && call.transcriptText) {
    console.log(`\n--- Identifying story segments ---`);
    const transcript = call.transcript as RetellTranscriptEntry[];

    const segments = await identifyStorySegments(transcript, call.transcriptText);

    if (segments.length > 0) {
      console.log(`Identified ${segments.length} story segments`);

      // Create story segment records
      for (const segment of segments) {
        const created = await prisma.storySegment.create({
          data: {
            callId: call.id,
            residentId: call.residentId,
            startTimeMs: segment.start_ms,
            endTimeMs: segment.end_ms,
            transcriptText: segment.transcript_text,
            speaker: segment.speaker,
            category: segment.category,
            storyQualityScore: segment.quality_score,
            emotionalIntensity: segment.emotional_intensity,
            isCompleteStory: segment.quality_score > 0.8,
            audioClipStatus: 'pending',
          },
        });

        console.log(`Created segment: ${created.id} (${segment.category})`);

        // Queue audio extraction for this segment (if we have audio)
        if (call.audioUrl) {
          await queueExtractAudioClip(created.id);
        }
      }
    } else {
      console.log('No story segments identified in this call');
    }
  }

  console.log(`\n========================================`);
  console.log(`Finished processing call: ${callId}`);
  console.log(`========================================\n`);
}
