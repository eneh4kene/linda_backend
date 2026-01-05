import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * GET /api/staff/concerns - Get all family check-in concerns
 * Returns concerns flagged by the AI during family check-ins
 */
router.get('/concerns', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { severity } = req.query;

    // Determine facility filter based on user role
    const facilityFilter = req.user?.role === 'ADMIN'
      ? {}
      : { resident: { facilityId: req.user?.facilityId } };

    // Get all check-ins with concerns
    const checkIns = await prisma.familyCheckIn.findMany({
      where: {
        concernsRaised: {
          not: []
        },
        ...facilityFilter,
      },
      include: {
        familyMember: {
          select: {
            firstName: true,
            lastName: true,
            relationship: true,
            phoneNumber: true,
          },
        },
        resident: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            preferredName: true,
            roomNumber: true,
            facility: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Flatten concerns with context
    const concerns = checkIns.flatMap((checkIn) => {
      const concernsArray = checkIn.concernsRaised as Array<{
        type: string;
        description: string;
        severity: 'low' | 'medium' | 'high';
      }>;

      return concernsArray
        .filter((c) => !severity || c.severity === severity)
        .map((concern) => ({
          id: `${checkIn.id}-${concernsArray.indexOf(concern)}`,
          checkInId: checkIn.id,
          checkInDate: checkIn.createdAt,
          concern,
          resident: {
            id: checkIn.resident.id,
            name: `${checkIn.resident.firstName} ${checkIn.resident.lastName || ''}`.trim(),
            preferredName: checkIn.resident.preferredName,
            roomNumber: checkIn.resident.roomNumber,
          },
          facility: checkIn.resident.facility,
          familyMember: {
            name: `${checkIn.familyMember.firstName} ${checkIn.familyMember.lastName}`,
            relationship: checkIn.familyMember.relationship,
            phoneNumber: checkIn.familyMember.phoneNumber,
          },
          periodCovered: {
            start: checkIn.periodStartDate,
            end: checkIn.periodEndDate,
          },
        }));
    });

    res.json({
      total: concerns.length,
      concerns,
    });
  } catch (error) {
    console.error('Error fetching concerns:', error);
    res.status(500).json({ error: 'Failed to fetch concerns' });
  }
});

/**
 * GET /api/staff/check-ins/summary - Get summary of recent family check-ins
 */
router.get('/check-ins/summary', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { days = '7' } = req.query;
    const daysBack = parseInt(days as string, 10);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // Determine facility filter based on user role
    const facilityFilter = req.user?.role === 'ADMIN'
      ? {}
      : { resident: { facilityId: req.user?.facilityId } };

    const checkIns = await prisma.familyCheckIn.findMany({
      where: {
        createdAt: {
          gte: startDate,
        },
        ...facilityFilter,
      },
      include: {
        resident: {
          select: {
            facilityId: true,
          },
        },
      },
    });

    // Calculate statistics
    const total = checkIns.length;
    const completed = checkIns.filter((c) => c.status === 'completed').length;
    const failed = checkIns.filter((c) => c.status === 'failed').length;

    const withConcerns = checkIns.filter(
      (c) => (c.concernsRaised as any[])?.length > 0
    ).length;

    const concernsBySeverity = {
      high: 0,
      medium: 0,
      low: 0,
    };

    checkIns.forEach((checkIn) => {
      const concerns = (checkIn.concernsRaised as any[]) || [];
      concerns.forEach((c: any) => {
        if (c.severity === 'high') concernsBySeverity.high++;
        if (c.severity === 'medium') concernsBySeverity.medium++;
        if (c.severity === 'low') concernsBySeverity.low++;
      });
    });

    res.json({
      period: {
        days: daysBack,
        startDate,
        endDate: new Date(),
      },
      summary: {
        totalCheckIns: total,
        completed,
        failed,
        pending: total - completed - failed,
        withConcerns,
        concernsBySeverity,
      },
    });
  } catch (error) {
    console.error('Error fetching check-in summary:', error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

/**
 * GET /api/staff/check-ins/recent - Get recent family check-ins with details
 */
router.get('/check-ins/recent', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { limit = '20' } = req.query;

    // Determine facility filter based on user role
    const facilityFilter = req.user?.role === 'ADMIN'
      ? {}
      : { resident: { facilityId: req.user?.facilityId } };

    const checkIns = await prisma.familyCheckIn.findMany({
      where: facilityFilter,
      include: {
        familyMember: {
          select: {
            firstName: true,
            lastName: true,
            relationship: true,
          },
        },
        resident: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            preferredName: true,
            roomNumber: true,
            facility: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: parseInt(limit as string, 10),
    });

    const formatted = checkIns.map((checkIn) => ({
      id: checkIn.id,
      date: checkIn.createdAt,
      status: checkIn.status,
      resident: {
        id: checkIn.resident.id,
        name: `${checkIn.resident.firstName} ${checkIn.resident.lastName || ''}`.trim(),
        preferredName: checkIn.resident.preferredName,
        roomNumber: checkIn.resident.roomNumber,
      },
      familyMember: {
        name: `${checkIn.familyMember.firstName} ${checkIn.familyMember.lastName}`,
        relationship: checkIn.familyMember.relationship,
      },
      facility: checkIn.resident.facility.name,
      moodSummary: checkIn.moodSummary,
      topics: checkIn.topicsDiscussed,
      concerns: (checkIn.concernsRaised as any[]) || [],
      periodCovered: {
        start: checkIn.periodStartDate,
        end: checkIn.periodEndDate,
      },
    }));

    res.json({
      checkIns: formatted,
    });
  } catch (error) {
    console.error('Error fetching recent check-ins:', error);
    res.status(500).json({ error: 'Failed to fetch recent check-ins' });
  }
});

/**
 * GET /api/staff/residents/:residentId/check-ins - Get all check-ins for a specific resident
 */
router.get('/residents/:residentId/check-ins', authenticate, async (req: AuthRequest, res: Response) => {
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

    const checkIns = await prisma.familyCheckIn.findMany({
      where: {
        residentId,
      },
      include: {
        familyMember: {
          select: {
            firstName: true,
            lastName: true,
            relationship: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      residentId,
      total: checkIns.length,
      checkIns,
    });
  } catch (error) {
    console.error('Error fetching resident check-ins:', error);
    res.status(500).json({ error: 'Failed to fetch check-ins' });
  }
});

export default router;
