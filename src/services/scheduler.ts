import { prisma } from '../lib/prisma';
import { buildCallContext } from './contextBuilder';
import { initiateCall } from './retell';
import { PreferredCallTimes } from '../types';

/**
 * Calculate hours since a date
 */
function hoursSince(date: Date): number {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return diffMs / (1000 * 60 * 60);
}

/**
 * Check if current time matches preferred call times
 */
function isPreferredTime(
  preferredTimes: any,
  currentHour: number,
  currentDayOfWeek: number
): boolean {
  // Default schedule: Tuesday (2), Thursday (4), Saturday (6) at 10am, 2pm, 6pm
  const defaultDays = [2, 4, 6];
  const defaultHours = [10, 14, 18];

  let days = defaultDays;
  let hours = defaultHours;

  if (preferredTimes && typeof preferredTimes === 'object') {
    const prefs = preferredTimes as PreferredCallTimes;
    if (Array.isArray(prefs.days) && prefs.days.length > 0) {
      days = prefs.days;
    }
    if (Array.isArray(prefs.hours) && prefs.hours.length > 0) {
      hours = prefs.hours;
    }
  }

  return days.includes(currentDayOfWeek) && hours.includes(currentHour);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check and initiate scheduled calls
 * Should be run via cron every 15 minutes
 */
export async function checkAndInitiateCalls(): Promise<void> {
  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday

  console.log(`\n[Scheduler] Running at ${now.toISOString()}`);
  console.log(`[Scheduler] Hour: ${hour}, Day: ${dayOfWeek}`);

  // Only run during appropriate hours (9am - 8pm)
  if (hour < 9 || hour >= 20) {
    console.log('[Scheduler] Outside calling hours (9am-8pm), skipping');
    return;
  }

  // Find residents eligible for calls
  const residents = await prisma.resident.findMany({
    where: {
      status: 'active',
      callConsent: true,
      phoneNumber: { not: null },
    },
    include: {
      calls: {
        where: { status: 'completed' },
        orderBy: { endedAt: 'desc' },
        take: 1,
      },
    },
  });

  console.log(`[Scheduler] Found ${residents.length} active residents with call consent`);

  let initiatedCount = 0;
  let skippedCount = 0;

  for (const resident of residents) {
    // Skip if called in last 20 hours
    const lastCall = resident.calls[0];
    if (lastCall && lastCall.endedAt && hoursSince(lastCall.endedAt) < 20) {
      console.log(
        `[Scheduler] Skipping ${resident.firstName} - called ${Math.round(hoursSince(lastCall.endedAt))} hours ago`
      );
      skippedCount++;
      continue;
    }

    // Check preferred times
    if (!isPreferredTime(resident.preferredCallTimes, hour, dayOfWeek)) {
      console.log(
        `[Scheduler] Skipping ${resident.firstName} - not a preferred time (hour: ${hour}, day: ${dayOfWeek})`
      );
      skippedCount++;
      continue;
    }

    try {
      console.log(`[Scheduler] ✅ Initiating call to ${resident.firstName}...`);

      // Build call context
      const context = await buildCallContext(resident.id);

      // Create call record
      const call = await prisma.call.create({
        data: {
          residentId: resident.id,
          callNumber: context.metadata.callNumber,
          isFirstCall: context.metadata.isFirstCall,
          status: 'initiating',
          scheduledAt: new Date(),
          contextUsed: context.dynamicVariables as any,
        },
      });

      // Initiate call with Retell
      const retellResponse = await initiateCall({
        residentId: resident.id,
        phoneNumber: resident.phoneNumber!,
        dynamicVariables: context.dynamicVariables,
        metadata: {
          dbCallId: call.id,
          residentId: resident.id,
          callNumber: context.metadata.callNumber,
          isFirstCall: context.metadata.isFirstCall,
        },
      });

      // Update call with Retell call ID
      await prisma.call.update({
        where: { id: call.id },
        data: {
          retellCallId: retellResponse.call_id,
        },
      });

      console.log(
        `[Scheduler] ✅ Call initiated for ${resident.firstName} (${retellResponse.call_id})`
      );
      initiatedCount++;

      // Add delay between calls to avoid overwhelming the system
      await sleep(30000); // 30 seconds
    } catch (error) {
      console.error(`[Scheduler] ❌ Failed to initiate call for ${resident.firstName}:`, error);
    }
  }

  console.log(`\n[Scheduler] Summary:`);
  console.log(`   - Initiated: ${initiatedCount}`);
  console.log(`   - Skipped: ${skippedCount}`);
  console.log(`   - Total processed: ${residents.length}\n`);
}
