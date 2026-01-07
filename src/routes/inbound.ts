import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { buildCallContext } from '../services/contextBuilder';
import { renderSystemPrompt } from '../services/prompt';
import { RetellDynamicVariables } from '../types';
import { generateFamilyCheckInSummary } from '../services/familyCheckInSummary';
import { notifyStaffOfConcerns } from '../services/concernNotifications';

const router = Router();

/**
 * POST /api/inbound/retell
 * Retell Dynamic Variables Webhook - UNIFIED ROUTING
 * Intelligently routes between resident calls and family check-in calls
 * based on the caller's phone number
 */
router.post('/retell', async (req, res) => {
    try {
        console.log('🔍 Raw Inbound Body:', JSON.stringify(req.body, null, 2));
        const { from_number, call_id } = req.body;
        console.log(`📞 Inbound call received from: ${from_number} (Call ID: ${call_id})`);

        // STEP 1: Check if caller is a family member
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

        if (familyMember) {
            console.log(`👨‍👩‍👧 Family member identified: ${familyMember.firstName} ${familyMember.lastName} (${familyMember.relationship})`);
            console.log(`   Resident: ${familyMember.resident.firstName} ${familyMember.resident.lastName}`);

            // ROUTE TO FAMILY CHECK-IN FLOW
            return await handleFamilyCheckInCall(familyMember, call_id, res);
        }

        // STEP 2: Check if caller is a resident
        const resident = await prisma.resident.findFirst({
            where: { phoneNumber: from_number },
        });

        if (resident) {
            console.log(`👤 Resident identified: ${resident.firstName} ${resident.lastName}`);

            // ROUTE TO RESIDENT CONVERSATION FLOW
            return await handleResidentCall(resident, call_id, res);
        }

        // STEP 3: Unknown caller
        console.warn(`⚠️  Unknown caller: ${from_number}`);
        return res.json({
            call_inbound: {
                dynamic_variables: {
                    caller_name: 'there',
                    script: `Hello, this is Linda. I don't recognize your phone number. If you're a resident or family member, please make sure you're calling from the phone number we have on file. If you need assistance, please contact the facility staff. Thank you for calling!`,
                }
            }
        });
    } catch (error) {
        console.error('Error handling inbound call:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * Handle family member check-in call
 */
async function handleFamilyCheckInCall(familyMember: any, call_id: string, res: any) {
    // Verify consent
    if (!familyMember.resident.familyCheckInConsent) {
        console.warn(`⚠️  Resident has not provided consent for family check-ins`);
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

    // Verify permissions
    if (!familyMember.canReceiveCheckIns) {
        console.warn(`⚠️  Family member does not have check-in permissions`);
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

    // Create check-in record
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

    // Generate summary
    console.log('⏳ Generating check-in summary...');
    const summary = await generateFamilyCheckInSummary(familyMember.resident.id, familyMember.id, 7);

    // Update check-in record
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
    console.log('📤 Script preview:', summary.generatedScript.slice(0, 100) + '...');

    // Notify staff of any concerns (async, don't block response)
    if (summary.concernsRaised.length > 0) {
        notifyStaffOfConcerns(
            summary.concernsRaised,
            checkIn.id,
            familyMember.resident.id,
            familyMember.id
        ).catch((error) => {
            console.error('Error sending concern notifications:', error);
        });
    }

    // Return dynamic variables to Retell
    return res.json({
        call_inbound: {
            dynamic_variables: {
                caller_name: familyMember.firstName,
                resident_name: familyMember.resident.preferredName || familyMember.resident.firstName,
                script: summary.generatedScript,
                call_type: 'family_checkin',
            },
        },
    });
}

/**
 * Handle resident conversation call
 */
async function handleResidentCall(resident: any, call_id: string, res: any) {
    // Build Context (Inbound Mode)
    console.log(`✅ Building conversation context...`);
    const context = await buildCallContext(resident.id, {
        isInbound: true,
        callTime: new Date(),
    });

    // Create Call Record
    const call = await prisma.call.create({
        data: {
            residentId: resident.id,
            retellCallId: call_id,
            direction: 'INBOUND',
            status: 'in_progress',
            callNumber: context.metadata.callNumber,
            isFirstCall: context.metadata.isFirstCall,
            startedAt: new Date(),
            contextUsed: context.dynamicVariables as any,
        },
    });
    console.log(`✅ Created inbound call record: ${call.id}`);

    // Render System Prompt using Handlebars
    const promptData = {
        ...context.dynamicVariables,
        mode_inbound: true,
        mode_outbound: false,
        memories: context.rawContext?.memories || [],
        last_call_summary: context.dynamicVariables.last_call_summary,
        favorite_topics: context.dynamicVariables.favorite_topics,
        recent_context: "Resident initiated this call."
    };

    const systemPrompt = renderSystemPrompt(promptData);

    const dynamicVariables = {
        ...context.dynamicVariables,
        system_prompt: systemPrompt,
        call_type: 'resident_conversation',
    };

    console.log('📤 Sending to Retell (Resident Call):');
    console.log('  preferred_name:', dynamicVariables.preferred_name);
    console.log('  memories:', dynamicVariables.memories?.substring(0, 100) + '...');
    console.log('  system_prompt length:', systemPrompt.length);

    // Return response to Retell
    return res.json({
        call_inbound: {
            dynamic_variables: dynamicVariables
        }
    });
}

export default router;
