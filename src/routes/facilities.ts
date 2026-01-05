import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * POST /api/facilities
 * Create a new facility (ADMIN only - for onboarding new care homes)
 */
router.post('/', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, phone, timezone, settings } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const facility = await prisma.facility.create({
      data: {
        name,
        phone,
        timezone: timezone || 'Europe/London',
        settings: settings || {},
      },
    });

    return res.status(201).json(facility);
  } catch (error) {
    console.error('Error creating facility:', error);
    return res.status(500).json({
      error: 'Failed to create facility',
      details: error instanceof Error ? error.message : undefined,
    });
  }
});

/**
 * GET /api/facilities/:id
 * Get facility details with residents
 * ADMIN: can view any facility
 * MANAGER/STAFF: can only view their own facility
 */
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check facility access
    if (req.user?.role !== 'ADMIN' && req.user?.facilityId !== id) {
      return res.status(403).json({ error: 'Access denied to this facility' });
    }

    const facility = await prisma.facility.findUnique({
      where: { id },
      include: {
        residents: {
          orderBy: { firstName: 'asc' },
        },
      },
    });

    if (!facility) {
      return res.status(404).json({ error: 'Facility not found' });
    }

    return res.json(facility);
  } catch (error) {
    console.error('Error fetching facility:', error);
    return res.status(500).json({
      error: 'Failed to fetch facility',
      details: error instanceof Error ? error.message : undefined,
    });
  }
});

/**
 * GET /api/facilities
 * List all facilities
 * ADMIN: sees all facilities
 * MANAGER/STAFF: only sees their own facility
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Build where clause based on role
    const where: any = {};

    // Non-ADMIN users can only see their own facility
    if (req.user?.role !== 'ADMIN' && req.user?.facilityId) {
      where.id = req.user.facilityId;
    }

    const facilities = await prisma.facility.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            residents: true,
          },
        },
      },
    });

    return res.json(facilities);
  } catch (error) {
    console.error('Error fetching facilities:', error);
    return res.status(500).json({
      error: 'Failed to fetch facilities',
      details: error instanceof Error ? error.message : undefined,
    });
  }
});

/**
 * PATCH /api/facilities/:id
 * Update facility details (ADMIN only)
 */
router.patch('/:id', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, phone, timezone, settings } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (timezone !== undefined) updateData.timezone = timezone;
    if (settings !== undefined) updateData.settings = settings;

    const facility = await prisma.facility.update({
      where: { id },
      data: updateData,
    });

    return res.json(facility);
  } catch (error) {
    console.error('Error updating facility:', error);
    return res.status(500).json({
      error: 'Failed to update facility',
      details: error instanceof Error ? error.message : undefined,
    });
  }
});

/**
 * DELETE /api/facilities/:id
 * Delete a facility (ADMIN only - will cascade delete residents and calls)
 */
router.delete('/:id', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.facility.delete({
      where: { id },
    });

    return res.status(204).send();
  } catch (error) {
    console.error('Error deleting facility:', error);
    return res.status(500).json({
      error: 'Failed to delete facility',
      details: error instanceof Error ? error.message : undefined,
    });
  }
});

export default router;
