import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Validation schema
const createFamilyMemberSchema = z.object({
  residentId: z.string().uuid(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  relationship: z.string().min(1),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/), // E.164 format
  email: z.string().email().optional(),
  canReceiveCheckIns: z.boolean().default(false),
  canAccessStarred: z.boolean().default(false),
  notes: z.string().optional(),
});

const updateFamilyMemberSchema = createFamilyMemberSchema.partial().omit({ residentId: true });

/**
 * POST /api/family-members - Create a new family member
 */
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const data = createFamilyMemberSchema.parse(req.body);

    // Verify resident exists and has consent
    const resident = await prisma.resident.findUnique({
      where: { id: data.residentId },
      select: { id: true, familyCheckInConsent: true, facilityId: true },
    });

    if (!resident) {
      return res.status(404).json({ error: 'Resident not found' });
    }

    // Check facility access
    if (req.user?.role !== 'ADMIN' && req.user?.facilityId !== resident.facilityId) {
      return res.status(403).json({ error: 'Access denied to this resident' });
    }

    if (!resident.familyCheckInConsent) {
      return res.status(403).json({
        error: 'Resident has not provided consent for family check-ins'
      });
    }

    // Check if phone number already exists
    const existingMember = await prisma.familyMember.findUnique({
      where: { phoneNumber: data.phoneNumber },
    });

    if (existingMember) {
      return res.status(409).json({
        error: 'A family member with this phone number already exists'
      });
    }

    const familyMember = await prisma.familyMember.create({
      data,
      include: {
        resident: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    res.status(201).json(familyMember);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error creating family member:', error);
    res.status(500).json({ error: 'Failed to create family member' });
  }
});

/**
 * GET /api/family-members/:id - Get a specific family member
 */
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const familyMember = await prisma.familyMember.findUnique({
      where: { id },
      include: {
        resident: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            preferredName: true,
            facilityId: true,
          },
        },
        checkIns: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            status: true,
            startedAt: true,
            endedAt: true,
            moodSummary: true,
            periodStartDate: true,
            periodEndDate: true,
          },
        },
      },
    });

    if (!familyMember) {
      return res.status(404).json({ error: 'Family member not found' });
    }

    // Check facility access
    if (req.user?.role !== 'ADMIN' && req.user?.facilityId !== familyMember.resident.facilityId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(familyMember);
  } catch (error) {
    console.error('Error fetching family member:', error);
    res.status(500).json({ error: 'Failed to fetch family member' });
  }
});

/**
 * GET /api/family-members/by-phone/:phoneNumber - Get family member by phone
 */
router.get('/by-phone/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;

    const familyMember = await prisma.familyMember.findUnique({
      where: { phoneNumber },
      include: {
        resident: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            preferredName: true,
            familyCheckInConsent: true,
          },
        },
      },
    });

    if (!familyMember) {
      return res.status(404).json({ error: 'Family member not found' });
    }

    res.json(familyMember);
  } catch (error) {
    console.error('Error fetching family member by phone:', error);
    res.status(500).json({ error: 'Failed to fetch family member' });
  }
});

/**
 * GET /api/family-members/resident/:residentId - List all family members for a resident
 */
router.get('/resident/:residentId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { residentId } = req.params;

    // Check facility access first
    const resident = await prisma.resident.findUnique({
      where: { id: residentId },
      select: { facilityId: true },
    });

    if (!resident) {
      return res.status(404).json({ error: 'Resident not found' });
    }

    if (req.user?.role !== 'ADMIN' && req.user?.facilityId !== resident.facilityId) {
      return res.status(403).json({ error: 'Access denied to this resident' });
    }

    const familyMembers = await prisma.familyMember.findMany({
      where: { residentId },
      include: {
        checkIns: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            status: true,
            startedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json(familyMembers);
  } catch (error) {
    console.error('Error listing family members:', error);
    res.status(500).json({ error: 'Failed to list family members' });
  }
});

/**
 * PATCH /api/family-members/:id - Update a family member
 */
router.patch('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = updateFamilyMemberSchema.parse(req.body);

    // Check facility access first
    const existingMember = await prisma.familyMember.findUnique({
      where: { id },
      include: {
        resident: {
          select: { facilityId: true },
        },
      },
    });

    if (!existingMember) {
      return res.status(404).json({ error: 'Family member not found' });
    }

    if (req.user?.role !== 'ADMIN' && req.user?.facilityId !== existingMember.resident.facilityId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if phone number is being updated and already exists
    if (data.phoneNumber) {
      const existingMember = await prisma.familyMember.findFirst({
        where: {
          phoneNumber: data.phoneNumber,
          id: { not: id },
        },
      });

      if (existingMember) {
        return res.status(409).json({
          error: 'Another family member with this phone number already exists'
        });
      }
    }

    const familyMember = await prisma.familyMember.update({
      where: { id },
      data,
      include: {
        resident: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    res.json(familyMember);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error updating family member:', error);
    res.status(500).json({ error: 'Failed to update family member' });
  }
});

/**
 * DELETE /api/family-members/:id - Delete a family member
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.familyMember.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting family member:', error);
    res.status(500).json({ error: 'Failed to delete family member' });
  }
});

export default router;
