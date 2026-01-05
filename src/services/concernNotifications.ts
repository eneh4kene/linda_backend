import { prisma } from '../lib/prisma';

export interface ConcernNotification {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  resident: {
    id: string;
    name: string;
    roomNumber?: string;
  };
  familyMember: {
    name: string;
    relationship: string;
  };
  checkInId: string;
  periodCovered: {
    start: Date;
    end: Date;
  };
}

/**
 * Notify staff about escalated concerns from family check-ins
 *
 * In production, this would:
 * - Send emails to facility staff
 * - Post to Slack/Teams channels
 * - Create tasks in care management systems
 * - Send SMS for high-severity concerns
 *
 * For MVP, we'll just log to console
 */
export async function notifyStaffOfConcerns(
  concerns: Array<{ type: string; description: string; severity: 'low' | 'medium' | 'high' }>,
  checkInId: string,
  residentId: string,
  familyMemberId: string
): Promise<void> {
  if (concerns.length === 0) {
    return;
  }

  // Get resident and family member details
  const [resident, familyMember, checkIn] = await Promise.all([
    prisma.resident.findUnique({
      where: { id: residentId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        roomNumber: true,
        facility: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    prisma.familyMember.findUnique({
      where: { id: familyMemberId },
      select: {
        firstName: true,
        lastName: true,
        relationship: true,
      },
    }),
    prisma.familyCheckIn.findUnique({
      where: { id: checkInId },
      select: {
        periodStartDate: true,
        periodEndDate: true,
      },
    }),
  ]);

  if (!resident || !familyMember || !checkIn) {
    console.error('❌ Could not send concern notifications: Missing data');
    return;
  }

  // Filter for medium and high severity concerns
  const urgentConcerns = concerns.filter((c) => c.severity === 'high' || c.severity === 'medium');

  if (urgentConcerns.length === 0) {
    console.log('ℹ️  No urgent concerns to notify staff about');
    return;
  }

  const notifications: ConcernNotification[] = urgentConcerns.map((concern) => ({
    ...concern,
    resident: {
      id: resident.id,
      name: `${resident.firstName} ${resident.lastName || ''}`.trim(),
      roomNumber: resident.roomNumber || undefined,
    },
    familyMember: {
      name: `${familyMember.firstName} ${familyMember.lastName}`,
      relationship: familyMember.relationship,
    },
    checkInId,
    periodCovered: {
      start: checkIn.periodStartDate!,
      end: checkIn.periodEndDate!,
    },
  }));

  // LOG NOTIFICATIONS (in production, replace with actual email/webhook/SMS)
  console.log('\n🚨 STAFF CONCERN NOTIFICATIONS 🚨\n');
  console.log(`Facility: ${resident.facility.name}`);
  console.log(`Resident: ${notifications[0].resident.name} (Room ${notifications[0].resident.roomNumber})`);
  console.log(`Family Member: ${notifications[0].familyMember.name} (${notifications[0].familyMember.relationship})`);
  console.log(`Check-In Period: ${checkIn.periodStartDate?.toLocaleDateString()} - ${checkIn.periodEndDate?.toLocaleDateString()}`);
  console.log(`\nConcerns (${notifications.length}):\n`);

  notifications.forEach((notification, idx) => {
    const emoji = notification.severity === 'high' ? '🔴' : '🟡';
    console.log(`${idx + 1}. ${emoji} [${notification.severity.toUpperCase()}] ${notification.type}`);
    console.log(`   ${notification.description}`);
  });

  console.log('\n━'.repeat(40));
  console.log('Action Required: Staff should follow up with resident');
  console.log('━'.repeat(40) + '\n');

  // TODO: In production, implement actual notifications:
  // - await sendEmail({ to: facility.staffEmail, subject: '...', body: '...' });
  // - await postToSlack({ channel: facility.slackChannel, message: '...' });
  // - await sendSMS({ to: facility.onCallPhone, message: '...' });
}

/**
 * Get notification preferences for a facility
 * (Placeholder for future implementation)
 */
export async function getFacilityNotificationPreferences(facilityId: string) {
  // TODO: Add notification preferences to Facility model
  // For now, return defaults
  return {
    emailEnabled: true,
    emailRecipients: ['staff@facility.com'],
    slackEnabled: false,
    slackWebhook: null,
    smsEnabled: false,
    smsRecipients: [],
    highSeverityOnly: false,
  };
}
