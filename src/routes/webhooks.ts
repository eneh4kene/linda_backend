import { Router } from 'express';
import { prisma } from '../lib/prisma';
// import { verifyWebhookSignature } from '../services/retell';
import { queueProcessCall } from '../queues';
import { downloadAudio, uploadAudio } from '../services/storage';
import { RetellWebhookEvent } from '../types';

const router = Router();

/**
 * POST /api/webhooks/retell
 * Handle Retell webhook events
 */
router.post('/retell', async (req, res) => {
  try {
    // Get raw body for signature verification
    // const signature = req.headers['x-retell-signature'] as string | undefined;
    // const rawBody = JSON.stringify(req.body);

    // Verify webhook signature
    // TEMPORARILY DISABLED FOR TESTING - Re-enable in production!
    // if (!verifyWebhookSignature(rawBody, signature)) {
    //   console.error('Invalid webhook signature');
    //   return res.status(401).json({ error: 'Invalid signature' });
    // }

    const event = req.body as any; // Using any because actual webhook structure differs from types
    const eventType = event.event;
    const callData = event.call;

    console.log(`✅ Webhook received: ${eventType}`);

    if (!callData) {
      console.warn(`⚠️  No call data in webhook for ${eventType}`);
      return res.status(200).json({ received: true, warning: 'No call data' });
    }

    const metadata = callData.metadata;
    const retellCallId = callData.call_id;

    // Try to get dbCallId from metadata first
    let dbCallId = metadata?.dbCallId;

    // If not in metadata, lookup by retellCallId
    if (!dbCallId && retellCallId) {
      const call = await prisma.call.findFirst({
        where: { retellCallId },
        select: { id: true }
      });

      if (call) {
        dbCallId = call.id;
        console.log(`📍 Found call by retellCallId: ${retellCallId} -> ${dbCallId}`);
      }
    }

    if (!dbCallId) {
      console.warn(`⚠️  No dbCallId found for ${eventType} (retellCallId: ${retellCallId})`);
      return res.status(200).json({ received: true, warning: 'No dbCallId found' });
    }

    const finalDbCallId = dbCallId;

    // Handle different event types
    switch (eventType) {
      case 'call_started': {
        await prisma.call.update({
          where: { id: finalDbCallId },
          data: {
            status: 'in_progress',
            startedAt: new Date(event.timestamp),
          },
        });
        console.log(`Call started: ${finalDbCallId}`);
        break;
      }

      case 'call_ended': {
        // Format transcript - handle both string and object formats
        let transcript = [];
        let transcriptText = '';

        if (typeof callData.transcript === 'string') {
          // Simple string format
          transcriptText = callData.transcript;
        } else if (callData.transcript_object && Array.isArray(callData.transcript_object)) {
          // Object format
          transcript = callData.transcript_object;
          transcriptText = transcript
            .map((entry: any) => `${entry.role === 'agent' ? 'Linda' : 'Resident'}: ${entry.content}`)
            .join('\n');
        } else if (callData.transcript && Array.isArray(callData.transcript)) {
          transcript = callData.transcript;
          transcriptText = transcript
            .map((entry: any) => `${entry.role === 'agent' ? 'Linda' : 'Resident'}: ${entry.content}`)
            .join('\n');
        }

        // Determine final status based on end reason
        let status = 'completed';
        if (callData.end_reason === 'no_answer' || callData.end_reason === 'voicemail') {
          status = 'no_answer';
        } else if (callData.end_reason === 'error') {
          status = 'failed';
        }

        // Update call with transcript and recording URL
        const updateData: any = {
          status,
          endedAt: callData.end_timestamp ? new Date(callData.end_timestamp) : new Date(),
          durationSeconds: callData.duration_ms ? Math.floor(callData.duration_ms / 1000) : null,
          transcript: transcript as any,
          transcriptText,
          audioDurationMs: callData.duration_ms,
        };

        // Store recording URL if available (we'll download it in the worker)
        if (callData.recording_url) {
          updateData.audioUrl = callData.recording_url;
        }

        await prisma.call.update({
          where: { id: finalDbCallId },
          data: updateData,
        });

        console.log(`Call ended: ${finalDbCallId} (${status})`);

        // Download and store audio immediately (Retell URLs expire quickly!)
        if (status === 'completed' && callData.recording_url) {
          try {
            console.log(`Downloading audio from Retell: ${callData.recording_url}`);
            const audioBuffer = await downloadAudio(callData.recording_url);
            console.log(`Downloaded ${audioBuffer.length} bytes`);

            const blobUrl = await uploadAudio(finalDbCallId, audioBuffer);
            console.log(`Uploaded to Vercel Blob: ${blobUrl}`);

            // Update with permanent URL
            await prisma.call.update({
              where: { id: finalDbCallId },
              data: { audioUrl: blobUrl },
            });
            console.log(`Audio permanently stored for call: ${finalDbCallId}`);
          } catch (audioError) {
            console.error(`Failed to download/store audio for call ${finalDbCallId}:`, audioError);
            // Continue anyway - we'll try again in the worker
          }
        }

        // Queue post-processing for completed calls
        if (status === 'completed') {
          await queueProcessCall(finalDbCallId);
          console.log(`Queued processing for call: ${finalDbCallId}`);
        }
        break;
      }

      case 'call_analyzed': {
        const analysis = callData.call_analysis;
        if (analysis) {
          // Parse sentiment score
          let sentimentScore: number | null = null;
          if (analysis.user_sentiment) {
            const sentimentMap: Record<string, number> = {
              positive: 0.8,
              neutral: 0.5,
              negative: 0.2,
            };
            sentimentScore = sentimentMap[analysis.user_sentiment.toLowerCase()] ?? null;
          }

          await prisma.call.update({
            where: { id: finalDbCallId },
            data: {
              summary: analysis.call_summary,
              sentimentScore,
              topicsDiscussed: analysis.topics_discussed as any,
            },
          });
          console.log(`Call analyzed: ${finalDbCallId}`);
        }
        break;
      }

      default:
        console.log(`Unknown event type: ${eventType}`);
    }

    // Always respond 200 quickly
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    // Still return 200 to prevent Retell from retrying
    return res.status(200).json({ received: true, error: 'Processing failed' });
  }
});

export default router;
