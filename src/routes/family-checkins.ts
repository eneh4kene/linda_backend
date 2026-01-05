import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { generateFamilyCheckInSummary } from '../services/familyCheckInSummary';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * POST /api/family-checkins/retell
 * Retell Dynamic Variables Webhook for Family Check-In calls
 * Triggered when a family member calls the dedicated check-in number
 */
router.post('/retell', async (req, res) => {
  try {
    console.log('📞 Family Check-In Call Received:', JSON.stringify(req.body, null, 2));
    const { from_number, call_id } = req.body;

    // 1. Find family member by phone number
    const familyMember = await prisma.familyMember.findUnique({
      where: { phoneNumber: from_number },
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
      console.warn(`⚠️  Unknown family member calling: ${from_number}`);
      // Return script for unknown caller
      const unknownCallerScript = `Hello, this is Linda. I'm sorry, but I don't have your phone number registered in our family check-in system. If you'd like to receive updates about a resident, please contact the facility staff to get set up. Thank you for calling!`;

      return res.json({
        call_inbound: {
          dynamic_variables: {
            caller_name: 'there',
            resident_name: '',
            script: unknownCallerScript,
          },
        },
      });
    }

    // 2. Verify consent
    if (!familyMember.resident.familyCheckInConsent) {
      console.warn(`⚠️  Resident ${familyMember.resident.id} has not provided consent for family check-ins`);
      const noConsentScript = `Hi ${familyMember.firstName}, this is Linda. Unfortunately, ${familyMember.resident.preferredName || familyMember.resident.firstName} hasn't yet provided consent for family check-in calls. Please speak with the facility staff if you'd like to set this up. Thank you for calling!`;

      return res.json({
        call_inbound: {
          dynamic_variables: {
            caller_name: familyMember.firstName,
            resident_name: familyMember.resident.preferredName || familyMember.resident.firstName,
            script: noConsentScript,
          },
        },
      });
    }

    // 3. Verify permissions
    if (!familyMember.canReceiveCheckIns) {
      console.warn(`⚠️  Family member ${familyMember.id} does not have check-in permissions`);
      const noPermissionScript = `Hi ${familyMember.firstName}, this is Linda. I see you're registered in our system, but you don't currently have permission to receive check-in updates. Please contact the facility staff if you'd like to enable this. Thank you for calling!`;

      return res.json({
        call_inbound: {
          dynamic_variables: {
            caller_name: familyMember.firstName,
            resident_name: familyMember.resident.preferredName || familyMember.resident.firstName,
            script: noPermissionScript,
          },
        },
      });
    }

    // 4. Create check-in record
    const checkIn = await prisma.familyCheckIn.create({
      data: {
        familyMemberId: familyMember.id,
        residentId: familyMember.resident.id,
        retellCallId: call_id,
        status: 'pending',
        startedAt: new Date(),
      },
    });

    console.log(`✅ Created family check-in record: ${checkIn.id}`);

    // 5. Generate summary (async, will update the check-in record)
    generateFamilyCheckInSummary(familyMember.resident.id, familyMember.id, 7)
      .then(async (summary) => {
        await prisma.familyCheckIn.update({
          where: { id: checkIn.id },
          data: {
            status: 'completed',
            moodSummary: summary.moodSummary,
            topicsDiscussed: summary.topicsDiscussed,
            concernsRaised: summary.concernsRaised,
            starredMoments: summary.starredMoments,
            generatedScript: summary.generatedScript,
            periodStartDate: summary.periodStartDate,
            periodEndDate: summary.periodEndDate,
            generatedAt: new Date(),
            generationModel: summary.generationModel,
            generationTokens: summary.generationTokens,
          },
        });
        console.log(`✅ Updated check-in ${checkIn.id} with generated summary`);
      })
      .catch(async (error) => {
        console.error('Error generating summary:', error);
        await prisma.familyCheckIn.update({
          where: { id: checkIn.id },
          data: { status: 'failed' },
        });
      });

    // 6. Return immediate response with loading message
    // Note: In production, we'd want to generate the summary first, but for MVP
    // we can return a "generating..." message and call back, or make the generation synchronous

    // For now, let's make it synchronous for better UX
    console.log('⏳ Generating summary...');
    const summary = await generateFamilyCheckInSummary(familyMember.resident.id, familyMember.id, 7);

    // Update the check-in record with the summary
    await prisma.familyCheckIn.update({
      where: { id: checkIn.id },
      data: {
        status: 'completed',
        endedAt: new Date(),
        moodSummary: summary.moodSummary,
        topicsDiscussed: summary.topicsDiscussed,
        concernsRaised: summary.concernsRaised,
        starredMoments: summary.starredMoments,
        generatedScript: summary.generatedScript,
        periodStartDate: summary.periodStartDate,
        periodEndDate: summary.periodEndDate,
        generatedAt: new Date(),
        generationModel: summary.generationModel,
        generationTokens: summary.generationTokens,
      },
    });

    console.log('✅ Summary generated successfully');
    console.log('📤 Script preview:', summary.generatedScript.slice(0, 150) + '...');

    // 7. Return dynamic variables to Retell
    return res.json({
      call_inbound: {
        dynamic_variables: {
          caller_name: familyMember.firstName,
          resident_name: familyMember.resident.preferredName || familyMember.resident.firstName,
          script: summary.generatedScript,
          mood_summary: summary.moodSummary,
          topics: summary.topicsDiscussed.join(', '),
        },
      },
    });
  } catch (error) {
    console.error('Error handling family check-in call:', error);

    // Return a graceful error message to the caller
    const errorScript = `Hello, this is Linda. I'm sorry, but I'm having trouble generating your update right now. Please try calling back in a few minutes, or contact the facility directly if you need immediate information. Thank you for your patience.`;

    return res.json({
      call_inbound: {
        dynamic_variables: {
          caller_name: 'there',
          resident_name: '',
          script: errorScript,
        },
      },
    });
  }
});

/**
 * GET /api/family-checkins/:id - Get a specific check-in
 */
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const checkIn = await prisma.familyCheckIn.findUnique({
      where: { id },
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
            firstName: true,
            lastName: true,
            preferredName: true,
            facilityId: true,
          },
        },
      },
    });

    if (!checkIn) {
      return res.status(404).json({ error: 'Check-in not found' });
    }

    // Check facility access
    if (req.user?.role !== 'ADMIN' && req.user?.facilityId !== checkIn.resident.facilityId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(checkIn);
  } catch (error) {
    console.error('Error fetching check-in:', error);
    res.status(500).json({ error: 'Failed to fetch check-in' });
  }
});

/**
 * GET /api/family-checkins/resident/:residentId - List all check-ins for a resident
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

    const checkIns = await prisma.familyCheckIn.findMany({
      where: { residentId },
      include: {
        familyMember: {
          select: {
            firstName: true,
            lastName: true,
            relationship: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(checkIns);
  } catch (error) {
    console.error('Error listing check-ins:', error);
    res.status(500).json({ error: 'Failed to list check-ins' });
  }
});

export default router;
