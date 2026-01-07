import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();

// Middleware to check if user is ADMIN
const requireAdmin = (req: any, res: any, next: any) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({
      error: 'Access denied. Admin role required for conversational intelligence features.'
    });
  }
  next();
};

/**
 * GET /api/patterns/:residentId
 * Get resident pattern (conversational intelligence)
 * ADMIN ONLY
 */
router.get('/:residentId', authenticate, requireAdmin, async (req, res) => {
  try {
    const { residentId } = req.params;

    const pattern = await prisma.residentPattern.findUnique({
      where: { residentId },
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

    if (!pattern) {
      return res.status(404).json({ error: 'No pattern found for this resident' });
    }

    return res.json(pattern);
  } catch (error) {
    console.error('Error fetching pattern:', error);
    return res.status(500).json({
      error: 'Failed to fetch pattern',
      details: error instanceof Error ? error.message : undefined,
    });
  }
});

/**
 * PATCH /api/patterns/:residentId
 * Update resident pattern (manual edits)
 * ADMIN ONLY
 */
router.patch('/:residentId', authenticate, requireAdmin, async (req, res) => {
  try {
    const { residentId } = req.params;
    const {
      personalitySummary,
      approachesToAvoid,
      favoriteTopics,
      sensitiveTopics,
      warmupNotes,
    } = req.body;

    // Only allow updating specific fields manually
    const updateData: any = {};
    if (personalitySummary !== undefined) updateData.personalitySummary = personalitySummary;
    if (approachesToAvoid !== undefined) updateData.approachesToAvoid = approachesToAvoid;
    if (favoriteTopics !== undefined) updateData.favoriteTopics = favoriteTopics;
    if (sensitiveTopics !== undefined) updateData.sensitiveTopics = sensitiveTopics;
    if (warmupNotes !== undefined) updateData.warmupNotes = warmupNotes;

    const pattern = await prisma.residentPattern.update({
      where: { residentId },
      data: updateData,
    });

    return res.json(pattern);
  } catch (error) {
    console.error('Error updating pattern:', error);
    return res.status(500).json({
      error: 'Failed to update pattern',
      details: error instanceof Error ? error.message : undefined,
    });
  }
});

/**
 * GET /api/patterns/:residentId/call-states
 * Get call states for a resident (history of vibes)
 * ADMIN ONLY
 */
router.get('/:residentId/call-states', authenticate, requireAdmin, async (req, res) => {
  try {
    const { residentId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

    const callStates = await prisma.callState.findMany({
      where: { residentId },
      orderBy: { recordedAt: 'desc' },
      take: limit,
      include: {
        call: {
          select: {
            id: true,
            callNumber: true,
            startedAt: true,
            endedAt: true,
            durationSeconds: true,
          },
        },
      },
    });

    return res.json(callStates);
  } catch (error) {
    console.error('Error fetching call states:', error);
    return res.status(500).json({
      error: 'Failed to fetch call states',
      details: error instanceof Error ? error.message : undefined,
    });
  }
});

export default router;
