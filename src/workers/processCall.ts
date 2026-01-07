import { prisma } from '../lib/prisma';
import { downloadAudio, uploadAudio } from '../services/storage';
import { extractMemories, upsertMemories } from './extractMemories';
import { identifyStorySegments } from './identifyStorySegments';
import { queueExtractAudioClip } from '../queues';
import { getCallDetails } from '../services/retell';
import { RetellTranscriptEntry } from '../types';
import { processCall as runPostCallAnalysis } from '../services/postCallAnalysis';

/**
 * Main post-call processing worker
 * Handles:
 * 1. Audio download and storage
 * 2. Memory extraction (legacy)
 * 3. Story segment identification
 * 4. Queueing audio clip extraction
 * 5. Post-call analysis (Memory Layer Phase 1)
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

  // Step 0: Fetch full transcript from Retell if missing
  const transcript = call.transcript as unknown as RetellTranscriptEntry[];
  if (!transcript || !Array.isArray(transcript) || transcript.length === 0) {
    if (call.retellCallId) {
      try {
        console.log(`\n--- Fetching full transcript from Retell ---`);
        console.log(`Retell Call ID: ${call.retellCallId}`);

        const callDetails = await getCallDetails(call.retellCallId);

        // Extract transcript with timestamps from the response
        let fullTranscript = [];
        if (callDetails.transcript && Array.isArray(callDetails.transcript)) {
          fullTranscript = callDetails.transcript;
        } else if (callDetails.transcript_object && Array.isArray(callDetails.transcript_object)) {
          fullTranscript = callDetails.transcript_object;
        }

        if (fullTranscript.length > 0) {
          console.log(`Fetched transcript with ${fullTranscript.length} entries`);

          // Update the call with the full transcript
          await prisma.call.update({
            where: { id: callId },
            data: { transcript: fullTranscript as any },
          });

          // Update local reference
          (call as any).transcript = fullTranscript;
          console.log('Transcript updated successfully');
        } else {
          console.log('No timestamped transcript available from Retell');
        }
      } catch (error) {
        console.error('Error fetching transcript from Retell:', error);
        // Continue processing even if transcript fetch fails
      }
    }
  }

  // Step 1: Download and store audio permanently in Vercel Blob
  // The webhook stores the Retell recording URL, but we want to save it to our own storage
  if (call.audioUrl && !call.audioUrl.includes('blob.vercel-storage.com')) {
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
    const transcript = call.transcript as unknown as RetellTranscriptEntry[];

    // Only process if we have actual transcript entries
    if (Array.isArray(transcript) && transcript.length > 0) {
      console.log(`\n--- Identifying story segments ---`);
      const residentName = call.resident.preferredName || call.resident.firstName;

      // Pass audio duration to enable timestamp validation
      const segments = await identifyStorySegments(
        residentName,
        transcript,
        call.audioDurationMs || undefined
      );

      if (segments.length > 0) {
        console.log(`Identified ${segments.length} story segments`);

        // Create story segment records
        for (const segment of segments) {
          const created = await prisma.storySegment.create({
            data: {
              callId: call.id,
              residentId: call.residentId,
              startTimeMs: Math.floor(segment.startTime * 1000), // Convert seconds to ms
              endTimeMs: Math.floor(segment.endTime * 1000),
              transcriptText: segment.transcriptText,
              speaker: 'resident', // Story segments are always from resident
              category: segment.category,
              emotionalTone: segment.emotionalTone,
              storyQualityScore: segment.qualityScore,
              qualityRationale: segment.qualityRationale,
              isCompleteStory: segment.isCompleteStory,
              audioClipStatus: 'pending',
              // New fields from enhanced extraction
              pullQuotes: segment.pullQuotes || [],
              sensitivityFlags: segment.sensitivityFlags || [],
              keyPeople: segment.keyPeople || [],
              keyPlaces: segment.keyPlaces || [],
              keyDates: segment.keyDates || [],
              keyObjects: segment.keyObjects || [],
            },
          });

          console.log(
            `Created segment: ${created.id} (${segment.category}, quality: ${segment.qualityScore}/5${
              segment.pullQuotes && segment.pullQuotes.length > 0 ? `, ${segment.pullQuotes.length} quotes` : ''
            }${
              segment.sensitivityFlags && segment.sensitivityFlags.length > 0
                ? `, flags: ${segment.sensitivityFlags.join(', ')}`
                : ''
            })`
          );

          // Queue audio extraction for this segment (if we have audio)
          if (call.audioUrl) {
            await queueExtractAudioClip(created.id);
          }
        }
      } else {
        console.log('No story segments identified in this call');
      }
    } else {
      console.log('No timestamped transcript available, skipping segment identification');
    }
  }

  // Step 4: Run post-call analysis (Memory Layer Phase 1)
  // This extracts call state, anticipated events, callbacks, and updates resident patterns
  if (call.transcriptText) {
    try {
      console.log(`\n--- Running post-call analysis (Memory Layer Phase 1) ---`);
      await runPostCallAnalysis(callId);
      console.log('Post-call analysis completed successfully');
    } catch (error) {
      console.error('Error in post-call analysis:', error);
      // Don't fail the entire job if analysis fails
      // The call will still be marked as processed for other features
    }
  }

  console.log(`\n========================================`);
  console.log(`Finished processing call: ${callId}`);
  console.log(`========================================\n`);
}
