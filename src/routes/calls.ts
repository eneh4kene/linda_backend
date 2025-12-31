import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { buildCallContext } from '../services/contextBuilder';
import { renderSystemPrompt } from '../services/prompt';
import { initiateCall } from '../services/retell';

const router = Router();

/**
 * POST /api/calls
 * Initiate a call to a resident
 */
router.post('/', async (req, res) => {
  try {
    const { residentId } = req.body;

    if (!residentId) {
      return res.status(400).json({ error: 'residentId is required' });
    }

    // Fetch resident
    const resident = await prisma.resident.findUnique({
      where: { id: residentId },
    });

    if (!resident) {
      return res.status(404).json({ error: 'Resident not found' });
    }

    if (!resident.callConsent) {
      return res.status(400).json({ error: 'Resident has not consented to calls' });
    }

    // Check phone number (unless in test mode)
    const isTestMode = process.env.RETELL_TEST_MODE === 'true';
    const phoneNumber = resident.phoneNumber || (isTestMode ? '+15555555555' : null);

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Resident has no phone number' });
    }

    if (isTestMode) {
      console.log('🧪 TEST MODE: Using dummy phone number for testing');
    }

    // Build call context
    const context = await buildCallContext(residentId);

    // Create call record
    const call = await prisma.call.create({
      data: {
        residentId,
        callNumber: context.metadata.callNumber,
        isFirstCall: context.metadata.isFirstCall,
        status: 'initiating',
        scheduledAt: new Date(),
        contextUsed: context.dynamicVariables as any,
      },
    });

    // Render System Prompt
    const promptData = {
      ...context.dynamicVariables,
      mode_inbound: false,
      mode_outbound: true,
      // Pass raw memories array for template iteration
      memories: context.rawContext?.memories || [],
      last_call_summary: context.dynamicVariables.last_call_summary,
      favorite_topics: context.dynamicVariables.favorite_topics,
    };

    const systemPrompt = renderSystemPrompt(promptData);

    // Initiate call with Retell
    const retellResponse = await initiateCall({
      residentId,
      phoneNumber: phoneNumber,
      dynamicVariables: context.dynamicVariables,
      metadata: {
        dbCallId: call.id,
        residentId,
        callNumber: context.metadata.callNumber,
        isFirstCall: context.metadata.isFirstCall,
      },
      retell_llm_prompt: systemPrompt,
    });

    // Update call with Retell call ID
    await prisma.call.update({
      where: { id: call.id },
      data: {
        retellCallId: retellResponse.call_id,
      },
    });

    return res.status(201).json({
      callId: call.id,
      retellCallId: retellResponse.call_id,
      status: 'initiating',
    });
  } catch (error) {
    console.error('Error initiating call:', error);
    return res.status(500).json({
      error: 'Failed to initiate call',
      details: error instanceof Error ? error.message : undefined,
    });
  }
});

/**
 * GET /api/calls/:id
 * Get call details including transcript and audio URL
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const call = await prisma.call.findUnique({
      where: { id },
      include: {
        resident: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            preferredName: true,
          },
        },
        memories: true,
        segments: true,
      },
    });

    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    return res.json(call);
  } catch (error) {
    console.error('Error fetching call:', error);
    return res.status(500).json({
      error: 'Failed to fetch call',
      details: error instanceof Error ? error.message : undefined,
    });
  }
});

/**
 * GET /api/calls?residentId=xxx
 * List calls for a resident
 */
router.get('/', async (req, res) => {
  try {
    const { residentId } = req.query;

    if (!residentId || typeof residentId !== 'string') {
      return res.status(400).json({ error: 'residentId query parameter is required' });
    }

    const calls = await prisma.call.findMany({
      where: { residentId },
      orderBy: { createdAt: 'desc' },
      include: {
        resident: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            preferredName: true,
          },
        },
      },
    });

    return res.json(calls);
  } catch (error) {
    console.error('Error fetching calls:', error);
    return res.status(500).json({
      error: 'Failed to fetch calls',
      details: error instanceof Error ? error.message : undefined,
    });
  }
});

export default router;
