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
 * GET /api/callbacks?residentId=xxx
 * Get callbacks for a resident
 * ADMIN ONLY
 */
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { residentId, stillLands } = req.query;

    if (!residentId || typeof residentId !== 'string') {
      return res.status(400).json({ error: 'residentId query parameter is required' });
    }

    const where: any = { residentId };
    if (stillLands !== undefined) {
      where.stillLands = stillLands === 'true';
    }

    const callbacks = await prisma.callback.findMany({
      where,
      orderBy: [
        { stillLands: 'desc' },
        { createdAt: 'desc' },
      ],
      include: {
        sourceCall: {
          select: {
            id: true,
            callNumber: true,
            startedAt: true,
          },
        },
      },
    });

    return res.json(callbacks);
  } catch (error) {
    console.error('Error fetching callbacks:', error);
    return res.status(500).json({
      error: 'Failed to fetch callbacks',
      details: error instanceof Error ? error.message : undefined,
    });
  }
});

/**
 * POST /api/callbacks
 * Create a new callback manually
 * ADMIN ONLY
 */
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const {
      residentId,
      callbackType,
      content,
      context,
      usageNotes,
    } = req.body;

    if (!residentId || !callbackType || !content) {
      return res.status(400).json({
        error: 'residentId, callbackType, and content are required',
      });
    }

    const callback = await prisma.callback.create({
      data: {
        residentId,
        callbackType,
        content,
        context: context || null,
        usageNotes: usageNotes || null,
        stillLands: true,
        timesUsed: 0,
      },
    });

    return res.status(201).json(callback);
  } catch (error) {
    console.error('Error creating callback:', error);
    return res.status(500).json({
      error: 'Failed to create callback',
      details: error instanceof Error ? error.message : undefined,
    });
  }
});

/**
 * PATCH /api/callbacks/:id
 * Update a callback
 * ADMIN ONLY
 */
router.patch('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      content,
      context,
      usageNotes,
      stillLands,
    } = req.body;

    const updateData: any = {};
    if (content !== undefined) updateData.content = content;
    if (context !== undefined) updateData.context = context;
    if (usageNotes !== undefined) updateData.usageNotes = usageNotes;
    if (stillLands !== undefined) updateData.stillLands = stillLands;

    const callback = await prisma.callback.update({
      where: { id },
      data: updateData,
    });

    return res.json(callback);
  } catch (error) {
    console.error('Error updating callback:', error);
    return res.status(500).json({
      error: 'Failed to update callback',
      details: error instanceof Error ? error.message : undefined,
    });
  }
});

/**
 * PATCH /api/callbacks/:id/mark-used
 * Increment usage counter for a callback
 * ADMIN ONLY
 */
router.patch('/:id/mark-used', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const callback = await prisma.callback.update({
      where: { id },
      data: {
        timesUsed: { increment: 1 },
        lastUsed: new Date(),
      },
    });

    return res.json(callback);
  } catch (error) {
    console.error('Error marking callback as used:', error);
    return res.status(500).json({
      error: 'Failed to mark callback',
      details: error instanceof Error ? error.message : undefined,
    });
  }
});

/**
 * DELETE /api/callbacks/:id
 * Delete a callback
 * ADMIN ONLY
 */
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.callback.delete({
      where: { id },
    });

    return res.status(204).send();
  } catch (error) {
    console.error('Error deleting callback:', error);
    return res.status(500).json({
      error: 'Failed to delete callback',
      details: error instanceof Error ? error.message : undefined,
    });
  }
});

export default router;
