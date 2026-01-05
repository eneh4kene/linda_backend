import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * POST /api/residents
 * Create a new resident
 */
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
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
      familyCheckInConsent,
      familyCheckInConsentDate,
      preferredCallTimes,
    } = req.body;

    if (!facilityId || !firstName) {
      return res.status(400).json({ error: 'facilityId and firstName are required' });
    }

    // Check facility access
    if (req.user?.role !== 'ADMIN' && req.user?.facilityId !== facilityId) {
      return res.status(403).json({ error: 'Access denied to this facility' });
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
        familyCheckInConsent: familyCheckInConsent || false,
        familyCheckInConsentDate: familyCheckInConsentDate ? new Date(familyCheckInConsentDate) : null,
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
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
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

    // Check facility access
    if (req.user?.role !== 'ADMIN' && req.user?.facilityId !== resident.facilityId) {
      return res.status(403).json({ error: 'Access denied to this resident' });
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
router.patch('/:id', authenticate, async (req: AuthRequest, res: Response) => {
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
      familyCheckInConsent,
      familyCheckInConsentDate,
      preferredCallTimes,
    } = req.body;

    // Check facility access first
    const existingResident = await prisma.resident.findUnique({ where: { id } });
    if (!existingResident) {
      return res.status(404).json({ error: 'Resident not found' });
    }

    if (req.user?.role !== 'ADMIN' && req.user?.facilityId !== existingResident.facilityId) {
      return res.status(403).json({ error: 'Access denied to this resident' });
    }

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
    if (familyCheckInConsent !== undefined) updateData.familyCheckInConsent = familyCheckInConsent;
    if (familyCheckInConsentDate !== undefined)
      updateData.familyCheckInConsentDate = new Date(familyCheckInConsentDate);
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
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { facilityId } = req.query;

    if (!facilityId || typeof facilityId !== 'string') {
      return res.status(400).json({ error: 'facilityId query parameter is required' });
    }

    // Check facility access
    if (req.user?.role !== 'ADMIN' && req.user?.facilityId !== facilityId) {
      return res.status(403).json({ error: 'Access denied to this facility' });
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

/**
 * DELETE /api/residents/:id
 * Delete a resident (ADMIN and MANAGER)
 */
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Get resident to check facility access
    const resident = await prisma.resident.findUnique({
      where: { id },
      select: { id: true, facilityId: true, firstName: true, lastName: true },
    });

    if (!resident) {
      return res.status(404).json({ error: 'Resident not found' });
    }

    // ADMIN can delete any resident, MANAGER can only delete residents in their facility
    if (req.user?.role === 'STAFF') {
      return res.status(403).json({ error: 'Staff members cannot delete residents' });
    }

    if (req.user?.role === 'MANAGER' && req.user?.facilityId !== resident.facilityId) {
      return res.status(403).json({ error: 'You can only delete residents in your own facility' });
    }

    // Delete resident (cascade will delete related data)
    await prisma.resident.delete({
      where: { id },
    });

    return res.json({
      message: 'Resident deleted successfully',
      resident: {
        id: resident.id,
        name: `${resident.firstName} ${resident.lastName || ''}`.trim(),
      },
    });
  } catch (error) {
    console.error('Error deleting resident:', error);
    return res.status(500).json({
      error: 'Failed to delete resident',
      details: error instanceof Error ? error.message : undefined,
    });
  }
});

export default router;
