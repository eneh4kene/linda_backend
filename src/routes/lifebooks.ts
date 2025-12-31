import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

/**
 * POST /api/lifebooks
 * Create a new lifebook for a resident
 */
router.post('/', async (req, res) => {
  try {
    const { residentId, title, tier, familyName, familyEmail } = req.body;

    if (!residentId) {
      return res.status(400).json({ error: 'residentId is required' });
    }

    // Check if book already exists
    const existing = await prisma.lifeStoryBook.findUnique({
      where: { residentId },
    });

    if (existing) {
      return res.status(409).json({ error: 'Lifebook already exists for this resident' });
    }

    const book = await prisma.lifeStoryBook.create({
      data: {
        residentId,
        title: title || null,
        tier: tier || 'basic',
        familyName: familyName || null,
        familyEmail: familyEmail || null,
        status: 'collecting',
      },
    });

    return res.status(201).json(book);
  } catch (error) {
    console.error('Error creating lifebook:', error);
    return res.status(500).json({
      error: 'Failed to create lifebook',
      details: error instanceof Error ? error.message : undefined,
    });
  }
});

/**
 * GET /api/lifebooks/:id
 * Get full lifebook with all chapters and entries (for family viewing)
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const book = await prisma.lifeStoryBook.findUnique({
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
        chapters: {
          orderBy: { orderIndex: 'asc' },
          include: {
            entries: {
              orderBy: { orderIndex: 'asc' },
              include: {
                segment: {
                  select: {
                    id: true,
                    transcriptText: true,
                    audioClipUrl: true,
                    startTimeMs: true,
                    endTimeMs: true,
                    category: true,
                    emotionalTone: true,
                    storyQualityScore: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!book) {
      return res.status(404).json({ error: 'Lifebook not found' });
    }

    return res.json(book);
  } catch (error) {
    console.error('Error fetching lifebook:', error);
    return res.status(500).json({
      error: 'Failed to fetch lifebook',
      details: error instanceof Error ? error.message : undefined,
    });
  }
});

/**
 * GET /api/lifebooks/resident/:residentId
 * Get lifebook by resident ID
 */
router.get('/resident/:residentId', async (req, res) => {
  try {
    const { residentId } = req.params;

    const book = await prisma.lifeStoryBook.findUnique({
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
        chapters: {
          orderBy: { orderIndex: 'asc' },
          include: {
            entries: {
              orderBy: { orderIndex: 'asc' },
              include: {
                segment: {
                  select: {
                    id: true,
                    transcriptText: true,
                    audioClipUrl: true,
                    startTimeMs: true,
                    endTimeMs: true,
                    category: true,
                    emotionalTone: true,
                    storyQualityScore: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!book) {
      return res.status(404).json({ error: 'Lifebook not found for this resident' });
    }

    return res.json(book);
  } catch (error) {
    console.error('Error fetching lifebook:', error);
    return res.status(500).json({
      error: 'Failed to fetch lifebook',
      details: error instanceof Error ? error.message : undefined,
    });
  }
});

/**
 * PATCH /api/lifebooks/:id
 * Update lifebook metadata
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, status, tier, familyName, familyEmail, familyPhone } = req.body;

    const updateData: any = {};

    if (title !== undefined) updateData.title = title;
    if (status !== undefined) updateData.status = status;
    if (tier !== undefined) updateData.tier = tier;
    if (familyName !== undefined) updateData.familyName = familyName;
    if (familyEmail !== undefined) updateData.familyEmail = familyEmail;
    if (familyPhone !== undefined) updateData.familyPhone = familyPhone;

    if (status === 'delivered') {
      updateData.deliveredAt = new Date();
    }

    const book = await prisma.lifeStoryBook.update({
      where: { id },
      data: updateData,
    });

    return res.json(book);
  } catch (error) {
    console.error('Error updating lifebook:', error);
    return res.status(500).json({
      error: 'Failed to update lifebook',
      details: error instanceof Error ? error.message : undefined,
    });
  }
});

/**
 * POST /api/lifebooks/:id/chapters
 * Create a new chapter
 */
router.post('/:id/chapters', async (req, res) => {
  try {
    const { id: bookId } = req.params;
    const { title, description, orderIndex } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Chapter title is required' });
    }

    const chapter = await prisma.lifeStoryChapter.create({
      data: {
        bookId,
        title,
        description: description || null,
        orderIndex: orderIndex || 0,
      },
    });

    return res.status(201).json(chapter);
  } catch (error) {
    console.error('Error creating chapter:', error);
    return res.status(500).json({
      error: 'Failed to create chapter',
      details: error instanceof Error ? error.message : undefined,
    });
  }
});

/**
 * POST /api/lifebooks/chapters/:chapterId/entries
 * Add segment to chapter
 */
router.post('/chapters/:chapterId/entries', async (req, res) => {
  try {
    const { chapterId } = req.params;
    const { segmentId, title, orderIndex, customTranscript } = req.body;

    if (!segmentId || !title) {
      return res.status(400).json({ error: 'segmentId and title are required' });
    }

    const entry = await prisma.lifeStoryEntry.create({
      data: {
        chapterId,
        segmentId,
        title,
        orderIndex: orderIndex || 0,
        customTranscript: customTranscript || null,
      },
    });

    return res.status(201).json(entry);
  } catch (error) {
    console.error('Error creating entry:', error);
    return res.status(500).json({
      error: 'Failed to create entry',
      details: error instanceof Error ? error.message : undefined,
    });
  }
});

/**
 * PATCH /api/lifebooks/chapters/:id
 * Update chapter
 */
router.patch('/chapters/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, orderIndex } = req.body;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (orderIndex !== undefined) updateData.orderIndex = orderIndex;

    const chapter = await prisma.lifeStoryChapter.update({
      where: { id },
      data: updateData,
    });

    return res.json(chapter);
  } catch (error) {
    console.error('Error updating chapter:', error);
    return res.status(500).json({
      error: 'Failed to update chapter',
      details: error instanceof Error ? error.message : undefined,
    });
  }
});

/**
 * DELETE /api/lifebooks/chapters/:id
 * Delete chapter (and all its entries)
 */
router.delete('/chapters/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.lifeStoryChapter.delete({
      where: { id },
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('Error deleting chapter:', error);
    return res.status(500).json({
      error: 'Failed to delete chapter',
      details: error instanceof Error ? error.message : undefined,
    });
  }
});

/**
 * DELETE /api/lifebooks/entries/:id
 * Remove entry from chapter
 */
router.delete('/entries/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.lifeStoryEntry.delete({
      where: { id },
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('Error deleting entry:', error);
    return res.status(500).json({
      error: 'Failed to delete entry',
      details: error instanceof Error ? error.message : undefined,
    });
  }
});

export default router;
