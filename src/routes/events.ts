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
 * GET /api/events?residentId=xxx
 * Get anticipated events for a resident
 * ADMIN ONLY
 */
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { residentId, status } = req.query;

    if (!residentId || typeof residentId !== 'string') {
      return res.status(400).json({ error: 'residentId query parameter is required' });
    }

    const where: any = { residentId };
    if (status && typeof status === 'string') {
      where.status = status;
    }

    const events = await prisma.anticipatedEvent.findMany({
      where,
      orderBy: [
        { eventDate: 'asc' },
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

    return res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    return res.status(500).json({
      error: 'Failed to fetch events',
      details: error instanceof Error ? error.message : undefined,
    });
  }
});

/**
 * POST /api/events
 * Create a new anticipated event manually
 * ADMIN ONLY
 */
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const {
      residentId,
      eventType,
      description,
      eventDate,
      recurring,
      recurringDetails,
      emotionalTone,
      shouldAskAbout,
    } = req.body;

    if (!residentId || !eventType || !description) {
      return res.status(400).json({
        error: 'residentId, eventType, and description are required',
      });
    }

    const event = await prisma.anticipatedEvent.create({
      data: {
        residentId,
        eventType,
        description,
        eventDate: eventDate ? new Date(eventDate) : null,
        recurring: recurring || null,
        recurringDetails: recurringDetails || null,
        emotionalTone: emotionalTone || 'neutral',
        shouldAskAbout: shouldAskAbout !== false,
        status: 'upcoming',
      },
    });

    return res.status(201).json(event);
  } catch (error) {
    console.error('Error creating event:', error);
    return res.status(500).json({
      error: 'Failed to create event',
      details: error instanceof Error ? error.message : undefined,
    });
  }
});

/**
 * PATCH /api/events/:id
 * Update an anticipated event
 * ADMIN ONLY
 */
router.patch('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      description,
      eventDate,
      emotionalTone,
      shouldAskAbout,
      askedAbout,
      status,
      outcomeNotes,
    } = req.body;

    const updateData: any = {};
    if (description !== undefined) updateData.description = description;
    if (eventDate !== undefined) updateData.eventDate = eventDate ? new Date(eventDate) : null;
    if (emotionalTone !== undefined) updateData.emotionalTone = emotionalTone;
    if (shouldAskAbout !== undefined) updateData.shouldAskAbout = shouldAskAbout;
    if (askedAbout !== undefined) updateData.askedAbout = askedAbout;
    if (status !== undefined) updateData.status = status;
    if (outcomeNotes !== undefined) updateData.outcomeNotes = outcomeNotes;

    const event = await prisma.anticipatedEvent.update({
      where: { id },
      data: updateData,
    });

    return res.json(event);
  } catch (error) {
    console.error('Error updating event:', error);
    return res.status(500).json({
      error: 'Failed to update event',
      details: error instanceof Error ? error.message : undefined,
    });
  }
});

/**
 * PATCH /api/events/:id/mark-asked
 * Mark an event as asked about
 * ADMIN ONLY
 */
router.patch('/:id/mark-asked', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { outcomeNotes } = req.body;

    const event = await prisma.anticipatedEvent.update({
      where: { id },
      data: {
        askedAbout: true,
        outcomeNotes: outcomeNotes || null,
      },
    });

    return res.json(event);
  } catch (error) {
    console.error('Error marking event as asked:', error);
    return res.status(500).json({
      error: 'Failed to mark event',
      details: error instanceof Error ? error.message : undefined,
    });
  }
});

/**
 * DELETE /api/events/:id
 * Delete an anticipated event
 * ADMIN ONLY
 */
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.anticipatedEvent.delete({
      where: { id },
    });

    return res.status(204).send();
  } catch (error) {
    console.error('Error deleting event:', error);
    return res.status(500).json({
      error: 'Failed to delete event',
      details: error instanceof Error ? error.message : undefined,
    });
  }
});

export default router;
