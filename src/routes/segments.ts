import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

/**
 * GET /api/segments?residentId=xxx
 * Get all story segments for a resident (for staff curation)
 */
router.get('/', async (req, res) => {
  try {
    const { residentId, category, isStarred, isExcluded } = req.query;

    if (!residentId || typeof residentId !== 'string') {
      return res.status(400).json({ error: 'residentId query parameter is required' });
    }

    const filters: any = { residentId };

    if (category && typeof category === 'string') {
      filters.category = category;
    }

    if (isStarred === 'true') {
      filters.isStarred = true;
    }

    if (isExcluded === 'true') {
      filters.isExcluded = true;
    } else if (isExcluded === 'false') {
      filters.isExcluded = false;
    }

    const segments = await prisma.storySegment.findMany({
      where: filters,
      include: {
        call: {
          select: {
            callNumber: true,
            startedAt: true,
            durationSeconds: true,
          },
        },
      },
      orderBy: [{ storyQualityScore: 'desc' }, { createdAt: 'desc' }],
    });

    return res.json(segments);
  } catch (error) {
    console.error('Error fetching segments:', error);
    return res.status(500).json({
      error: 'Failed to fetch segments',
      details: error instanceof Error ? error.message : undefined,
    });
  }
});

/**
 * GET /api/segments/:id
 * Get a single segment with full details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const segment = await prisma.storySegment.findUnique({
      where: { id },
      include: {
        call: {
          select: {
            id: true,
            callNumber: true,
            startedAt: true,
            durationSeconds: true,
            audioUrl: true,
          },
        },
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

    if (!segment) {
      return res.status(404).json({ error: 'Segment not found' });
    }

    return res.json(segment);
  } catch (error) {
    console.error('Error fetching segment:', error);
    return res.status(500).json({
      error: 'Failed to fetch segment',
      details: error instanceof Error ? error.message : undefined,
    });
  }
});

/**
 * PATCH /api/segments/:id
 * Update segment (star, exclude, edit title, add notes)
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { isStarred, isExcluded, staffNotes } = req.body;

    const updateData: any = {};

    if (typeof isStarred === 'boolean') {
      updateData.isStarred = isStarred;
    }

    if (typeof isExcluded === 'boolean') {
      updateData.isExcluded = isExcluded;
    }

    if (staffNotes !== undefined) {
      updateData.staffNotes = staffNotes;
    }

    const segment = await prisma.storySegment.update({
      where: { id },
      data: updateData,
    });

    return res.json(segment);
  } catch (error) {
    console.error('Error updating segment:', error);
    return res.status(500).json({
      error: 'Failed to update segment',
      details: error instanceof Error ? error.message : undefined,
    });
  }
});

export default router;
