import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

/**
 * POST /api/facilities
 * Create a new facility
 */
router.post('/', async (req, res) => {
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
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

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
 */
router.get('/', async (_req, res) => {
  try {
    const facilities = await prisma.facility.findMany({
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
 * Update facility details
 */
router.patch('/:id', async (req, res) => {
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
 * Delete a facility (will cascade delete residents and calls)
 */
router.delete('/:id', async (req, res) => {
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
