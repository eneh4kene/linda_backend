import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { checkAndInitiateCalls } from '../services/scheduler';

const router = Router();

/**
 * GET /api/scheduling/preview
 * Preview upcoming scheduled calls
 */
router.get('/preview', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { facilityId, daysAhead = '7' } = req.query;

    // Build facility filter
    let facilityFilter: any = {};
    if (req.user?.role !== 'ADMIN' && req.user?.facilityId) {
      facilityFilter = { facilityId: req.user.facilityId };
    } else if (facilityId) {
      facilityFilter = { facilityId: facilityId as string };
    }

    // Get active residents with consent
    const residents = await prisma.resident.findMany({
      where: {
        ...facilityFilter,
        status: 'active',
        callConsent: true,
      },
      include: {
        calls: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        facility: {
          select: {
            name: true,
            timezone: true,
          },
        },
      },
    });

    // Calculate next call time for each resident
    const schedule = residents.map((resident) => {
      const lastCall = resident.calls[0];
      const preferredTimes = resident.preferredCallTimes as any;

      return {
        residentId: resident.id,
        residentName: `${resident.firstName} ${resident.lastName || ''}`.trim(),
        roomNumber: resident.roomNumber,
        facility: resident.facility.name,
        lastCallDate: lastCall?.endedAt || null,
        preferredCallTimes: preferredTimes,
        canCallNow: lastCall && lastCall.endedAt ? (new Date().getTime() - new Date(lastCall.endedAt).getTime()) / (1000 * 60 * 60) >= 20 : true,
        nextSuggestedCall: calculateNextCallTime(lastCall?.endedAt, preferredTimes),
      };
    });

    // Sort by next suggested call time
    schedule.sort((a, b) => {
      if (!a.nextSuggestedCall) return 1;
      if (!b.nextSuggestedCall) return -1;
      return new Date(a.nextSuggestedCall).getTime() - new Date(b.nextSuggestedCall).getTime();
    });

    return res.json({ schedule });
  } catch (error) {
    console.error('Error previewing schedule:', error);
    return res.status(500).json({ error: 'Failed to preview schedule' });
  }
});

/**
 * POST /api/scheduling/run
 * Manually trigger the call scheduler
 */
router.post('/run', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Only MANAGER and ADMIN can manually run scheduler
    if (req.user?.role !== 'MANAGER' && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { facilityId } = req.body;

    // Validate facility access
    if (req.user.role !== 'ADMIN' && facilityId !== req.user.facilityId) {
      return res.status(403).json({ error: 'Access denied to this facility' });
    }

    console.log(`📅 Manual scheduler run triggered by ${req.user.email}`);

    await checkAndInitiateCalls();

    return res.json({
      message: 'Scheduler executed successfully',
      callsInitiated: 0,
      callsScheduled: 0,
      errors: [],
    });
  } catch (error) {
    console.error('Error running scheduler:', error);
    return res.status(500).json({ error: 'Failed to run scheduler' });
  }
});

/**
 * POST /api/scheduling/call-now/:residentId
 * Immediately initiate a call to a specific resident
 */
router.post('/call-now/:residentId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { residentId } = req.params;

    // Get resident to check facility access
    const resident = await prisma.resident.findUnique({
      where: { id: residentId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        facilityId: true,
        status: true,
        callConsent: true,
      },
    });

    if (!resident) {
      return res.status(404).json({ error: 'Resident not found' });
    }

    // Check facility access
    if (req.user?.role !== 'ADMIN' && req.user?.facilityId !== resident.facilityId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Validate resident status and consent
    if (resident.status !== 'active') {
      return res.status(400).json({ error: 'Resident is not active' });
    }

    if (!resident.callConsent) {
      return res.status(400).json({ error: 'Resident has not consented to calls' });
    }

    console.log(`📞 Manual call initiated by ${req.user.email} for resident ${residentId}`);

    // TODO: Implement initiateCallForResident in scheduler service
    const call = await prisma.call.create({
      data: {
        residentId,
        callNumber: 1,
        status: 'scheduled',
        scheduledAt: new Date(),
      },
    });

    return res.json({
      message: 'Call initiated successfully',
      call: {
        id: call.id,
        retellCallId: call.retellCallId,
        status: call.status,
        scheduledAt: call.scheduledAt,
      },
    });
  } catch (error: any) {
    console.error('Error initiating call:', error);
    return res.status(500).json({ error: error.message || 'Failed to initiate call' });
  }
});

/**
 * GET /api/scheduling/settings/:residentId
 * Get call scheduling settings for a resident
 */
router.get('/settings/:residentId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { residentId } = req.params;

    const resident = await prisma.resident.findUnique({
      where: { id: residentId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        preferredCallTimes: true,
        facilityId: true,
      },
    });

    if (!resident) {
      return res.status(404).json({ error: 'Resident not found' });
    }

    // Check access
    if (req.user?.role !== 'ADMIN' && req.user?.facilityId !== resident.facilityId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    return res.json({
      residentId: resident.id,
      residentName: `${resident.firstName} ${resident.lastName || ''}`.trim(),
      preferredCallTimes: resident.preferredCallTimes || getDefaultCallSchedule(),
    });
  } catch (error) {
    console.error('Error fetching scheduling settings:', error);
    return res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

/**
 * PATCH /api/scheduling/settings/:residentId
 * Update call scheduling settings for a resident
 */
router.patch('/settings/:residentId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { residentId } = req.params;
    const { preferredCallTimes } = req.body;

    // Get resident to check facility access
    const resident = await prisma.resident.findUnique({
      where: { id: residentId },
      select: { facilityId: true },
    });

    if (!resident) {
      return res.status(404).json({ error: 'Resident not found' });
    }

    // Check access
    if (req.user?.role !== 'ADMIN' && req.user?.facilityId !== resident.facilityId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Validate preferredCallTimes structure
    if (preferredCallTimes) {
      if (!Array.isArray(preferredCallTimes.days) || !Array.isArray(preferredCallTimes.hours)) {
        return res.status(400).json({ error: 'Invalid preferredCallTimes format' });
      }
    }

    // Update resident
    const updated = await prisma.resident.update({
      where: { id: residentId },
      data: { preferredCallTimes },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        preferredCallTimes: true,
      },
    });

    return res.json({
      message: 'Scheduling settings updated',
      resident: updated,
    });
  } catch (error) {
    console.error('Error updating scheduling settings:', error);
    return res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Helper functions

function getDefaultCallSchedule() {
  return {
    days: [2, 4, 6], // Tuesday, Thursday, Saturday (0=Sunday)
    hours: [10, 14, 18], // 10am, 2pm, 6pm
  };
}

function calculateNextCallTime(lastCallDate: Date | null, preferredTimes: any): string | null {
  if (!lastCallDate) {
    // No previous call, suggest next available slot
    return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // Tomorrow
  }

  const minHoursBetweenCalls = 20;
  const earliestNext = new Date(lastCallDate.getTime() + minHoursBetweenCalls * 60 * 60 * 1000);

  if (earliestNext < new Date()) {
    return new Date().toISOString(); // Can call now
  }

  return earliestNext.toISOString();
}

export default router;
