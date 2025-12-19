import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { verifyWebhookSignature } from '../services/retell';
import { queueProcessCall } from '../queues';
import { RetellWebhookEvent } from '../types';

const router = Router();

/**
 * POST /api/webhooks/retell
 * Handle Retell webhook events
 */
router.post('/retell', async (req, res) => {
  try {
    // Get raw body for signature verification
    const signature = req.headers['x-retell-signature'] as string | undefined;
    const rawBody = JSON.stringify(req.body);

    // Verify webhook signature
    if (!verifyWebhookSignature(rawBody, signature)) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = req.body as RetellWebhookEvent;
    const { event: eventType, data } = event;
    const { metadata } = data;

    if (!metadata?.dbCallId) {
      console.error('Webhook missing dbCallId in metadata');
      return res.status(400).json({ error: 'Missing dbCallId in metadata' });
    }

    const dbCallId = metadata.dbCallId;

    // Handle different event types
    switch (eventType) {
      case 'call_started': {
        await prisma.call.update({
          where: { id: dbCallId },
          data: {
            status: 'in_progress',
            startedAt: new Date(event.timestamp),
          },
        });
        console.log(`Call started: ${dbCallId}`);
        break;
      }

      case 'call_ended': {
        // Format transcript
        const transcript = data.transcript || [];
        const transcriptText = transcript
          .map((entry) => `${entry.role === 'agent' ? 'Linda' : 'Resident'}: ${entry.content}`)
          .join('\n');

        // Determine final status based on end reason
        let status = 'completed';
        if (data.end_reason === 'no_answer' || data.end_reason === 'voicemail') {
          status = 'no_answer';
        } else if (data.end_reason === 'error') {
          status = 'failed';
        }

        // Update call with transcript and recording URL
        const updateData: any = {
          status,
          endedAt: new Date(event.timestamp),
          durationSeconds: data.duration_ms ? Math.floor(data.duration_ms / 1000) : null,
          transcript: transcript as any,
          transcriptText,
          audioDurationMs: data.duration_ms,
        };

        // Store recording URL if available (we'll download it in the worker)
        if (data.recording_url) {
          updateData.audioUrl = data.recording_url;
        }

        await prisma.call.update({
          where: { id: dbCallId },
          data: updateData,
        });

        console.log(`Call ended: ${dbCallId} (${status})`);

        // Queue post-processing for completed calls
        if (status === 'completed') {
          await queueProcessCall(dbCallId);
          console.log(`Queued processing for call: ${dbCallId}`);
        }
        break;
      }

      case 'call_analyzed': {
        const analysis = data.call_analysis;
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
            where: { id: dbCallId },
            data: {
              summary: analysis.call_summary,
              sentimentScore,
              topicsDiscussed: analysis.topics_discussed as any,
            },
          });
          console.log(`Call analyzed: ${dbCallId}`);
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
