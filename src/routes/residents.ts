import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

/**
 * POST /api/residents
 * Create a new resident
 */
router.post('/', async (req, res) => {
  try {
    const {
      facilityId,
      firstName,
      lastName,
      preferredName,
      phoneNumber,
      roomNumber,
      communicationNotes,
      favoriteTopics,
      avoidTopics,
      callConsent,
      callConsentDate,
      lifestoryConsent,
      lifestoryConsentDate,
      preferredCallTimes,
    } = req.body;

    if (!facilityId || !firstName) {
      return res.status(400).json({ error: 'facilityId and firstName are required' });
    }

    // Verify facility exists
    const facility = await prisma.facility.findUnique({
      where: { id: facilityId },
    });

    if (!facility) {
      return res.status(404).json({ error: 'Facility not found' });
    }

    const resident = await prisma.resident.create({
      data: {
        facilityId,
        firstName,
        lastName,
        preferredName,
        phoneNumber,
        roomNumber,
        communicationNotes,
        favoriteTopics,
        avoidTopics,
        callConsent: callConsent || false,
        callConsentDate: callConsentDate ? new Date(callConsentDate) : null,
        lifestoryConsent: lifestoryConsent || false,
        lifestoryConsentDate: lifestoryConsentDate ? new Date(lifestoryConsentDate) : null,
        preferredCallTimes: preferredCallTimes || null,
      },
    });

    return res.status(201).json(resident);
  } catch (error) {
    console.error('Error creating resident:', error);
    return res.status(500).json({
      error: 'Failed to create resident',
      details: error instanceof Error ? error.message : undefined,
    });
  }
});

/**
 * GET /api/residents/:id
 * Get resident details including memories and recent calls
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const resident = await prisma.resident.findUnique({
      where: { id },
      include: {
        facility: true,
        memories: {
          where: { isActive: true },
          orderBy: [{ timesMentioned: 'desc' }, { lastMentionedAt: 'desc' }],
        },
        calls: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        segments: {
          where: { isExcluded: false },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!resident) {
      return res.status(404).json({ error: 'Resident not found' });
    }

    return res.json(resident);
  } catch (error) {
    console.error('Error fetching resident:', error);
    return res.status(500).json({
      error: 'Failed to fetch resident',
      details: error instanceof Error ? error.message : undefined,
    });
  }
});

/**
 * PATCH /api/residents/:id
 * Update resident details
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      firstName,
      lastName,
      preferredName,
      phoneNumber,
      roomNumber,
      status,
      communicationNotes,
      favoriteTopics,
      avoidTopics,
      callConsent,
      callConsentDate,
      lifestoryConsent,
      lifestoryConsentDate,
      preferredCallTimes,
    } = req.body;

    // Build update object with only provided fields
    const updateData: any = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (preferredName !== undefined) updateData.preferredName = preferredName;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (roomNumber !== undefined) updateData.roomNumber = roomNumber;
    if (status !== undefined) updateData.status = status;
    if (communicationNotes !== undefined) updateData.communicationNotes = communicationNotes;
    if (favoriteTopics !== undefined) updateData.favoriteTopics = favoriteTopics;
    if (avoidTopics !== undefined) updateData.avoidTopics = avoidTopics;
    if (callConsent !== undefined) updateData.callConsent = callConsent;
    if (callConsentDate !== undefined) updateData.callConsentDate = new Date(callConsentDate);
    if (lifestoryConsent !== undefined) updateData.lifestoryConsent = lifestoryConsent;
    if (lifestoryConsentDate !== undefined)
      updateData.lifestoryConsentDate = new Date(lifestoryConsentDate);
    if (preferredCallTimes !== undefined) updateData.preferredCallTimes = preferredCallTimes;

    const resident = await prisma.resident.update({
      where: { id },
      data: updateData,
    });

    return res.json(resident);
  } catch (error) {
    console.error('Error updating resident:', error);
    return res.status(500).json({
      error: 'Failed to update resident',
      details: error instanceof Error ? error.message : undefined,
    });
  }
});

/**
 * GET /api/residents?facilityId=xxx
 * List residents for a facility
 */
router.get('/', async (req, res) => {
  try {
    const { facilityId } = req.query;

    if (!facilityId || typeof facilityId !== 'string') {
      return res.status(400).json({ error: 'facilityId query parameter is required' });
    }

    const residents = await prisma.resident.findMany({
      where: { facilityId },
      orderBy: { firstName: 'asc' },
      include: {
        facility: true,
        _count: {
          select: {
            calls: true,
            memories: true,
          },
        },
      },
    });

    return res.json(residents);
  } catch (error) {
    console.error('Error fetching residents:', error);
    return res.status(500).json({
      error: 'Failed to fetch residents',
      details: error instanceof Error ? error.message : undefined,
    });
  }
});

export default router;
