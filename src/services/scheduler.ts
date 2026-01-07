import { prisma } from '../lib/prisma';
import { buildCallContext } from './contextBuilder';
import { initiateCall } from './retell';
import { PreferredCallTimes, TimeWindow, SchedulingContext } from '../types';

/**
 * Calculate days since a date
 */
function daysSince(date: Date): number {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Calculate hours since a date
 */
function hoursSince(date: Date): number {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return diffMs / (1000 * 60 * 60);
}

/**
 * Get the start of the current week (Monday 00:00)
 */
function getStartOfWeek(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust to Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/**
 * Check if current time is within a time window
 */
function isInTimeWindow(window: TimeWindow, currentHour: number, currentMinute: number): boolean {
  const [startHour, startMinute] = window.start.split(':').map(Number);
  const [endHour, endMinute] = window.end.split(':').map(Number);

  const currentMinutes = currentHour * 60 + currentMinute;
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

/**
 * Check if current time matches preferred call times (with flexibility)
 */
function isPreferredTime(
  preferredTimes: any,
  currentHour: number,
  currentMinute: number,
  currentDayOfWeek: number,
  allowDrift: boolean = false
): boolean {
  // Default schedule: Tuesday (2), Thursday (4), Saturday (6) at 10am-11am, 2pm-3pm, 6pm-7pm
  const defaultDays = [2, 4, 6];
  const defaultWindows: TimeWindow[] = [
    { start: '10:00', end: '11:00' },
    { start: '14:00', end: '15:00' },
    { start: '18:00', end: '19:00' },
  ];

  let days = defaultDays;
  let timeWindows = defaultWindows;
  let hours: number[] = [];

  if (preferredTimes && typeof preferredTimes === 'object') {
    const prefs = preferredTimes as PreferredCallTimes;

    if (Array.isArray(prefs.days) && prefs.days.length > 0) {
      days = prefs.days;
    }

    // Support both new timeWindows and legacy hours
    if (prefs.timeWindows && Array.isArray(prefs.timeWindows) && prefs.timeWindows.length > 0) {
      timeWindows = prefs.timeWindows;
    } else if (Array.isArray(prefs.hours) && prefs.hours.length > 0) {
      hours = prefs.hours;
      // Convert hours to time windows (1 hour windows)
      timeWindows = hours.map(h => ({ start: `${h}:00`, end: `${h + 1}:00` }));
    }
  }

  // Check day match (with drift allowance)
  let dayMatches = days.includes(currentDayOfWeek);
  if (!dayMatches && allowDrift) {
    // Allow calling on adjacent days if it's been too long
    const yesterday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
    const tomorrow = currentDayOfWeek === 6 ? 0 : currentDayOfWeek + 1;
    dayMatches = days.includes(yesterday) || days.includes(tomorrow);
  }

  if (!dayMatches) {
    return false;
  }

  // Check time match
  for (const window of timeWindows) {
    if (isInTimeWindow(window, currentHour, currentMinute)) {
      return true;
    }
  }

  return false;
}

/**
 * Calculate scheduling context for a resident
 */
async function calculateSchedulingContext(residentId: string): Promise<SchedulingContext> {
  const startOfWeek = getStartOfWeek();

  // Get all calls this week (both inbound and outbound)
  const callsThisWeek = await prisma.call.findMany({
    where: {
      residentId,
      status: 'completed',
      endedAt: { gte: startOfWeek },
    },
    orderBy: { endedAt: 'desc' },
  });

  const resident = await prisma.resident.findUnique({
    where: { id: residentId },
    select: {
      targetCallsPerWeek: true,
      minDaysBetweenCalls: true,
      maxDaysBetweenCalls: true,
      lastOutboundCallDate: true,
      lastInboundCallDate: true,
    },
  });

  if (!resident) {
    throw new Error(`Resident ${residentId} not found`);
  }

  const lastCallDate =
    resident.lastOutboundCallDate && resident.lastInboundCallDate
      ? new Date(Math.max(
          new Date(resident.lastOutboundCallDate).getTime(),
          new Date(resident.lastInboundCallDate).getTime()
        ))
      : resident.lastOutboundCallDate || resident.lastInboundCallDate || null;

  const daysSinceLastCall = lastCallDate ? daysSince(lastCallDate) : 999;

  // Determine if resident is due for a call
  let isDue = false;
  let reason = '';

  // Rule 1: Max days exceeded - MUST call
  if (daysSinceLastCall >= resident.maxDaysBetweenCalls) {
    isDue = true;
    reason = `Max days exceeded (${daysSinceLastCall} >= ${resident.maxDaysBetweenCalls})`;
  }
  // Rule 2: Min days not met - TOO SOON
  else if (daysSinceLastCall < resident.minDaysBetweenCalls) {
    isDue = false;
    reason = `Too soon (${daysSinceLastCall} < ${resident.minDaysBetweenCalls} days)`;
  }
  // Rule 3: Target calls not met and min days satisfied
  else if (callsThisWeek.length < resident.targetCallsPerWeek) {
    isDue = true;
    reason = `Under weekly target (${callsThisWeek.length}/${resident.targetCallsPerWeek} calls this week)`;
  }
  // Rule 4: Already met target
  else {
    isDue = false;
    reason = `Weekly target met (${callsThisWeek.length}/${resident.targetCallsPerWeek})`;
  }

  return {
    residentId,
    targetCallsThisWeek: resident.targetCallsPerWeek,
    callsMadeThisWeek: callsThisWeek.length,
    lastCallDate,
    daysSinceLastCall,
    isDue,
    reason,
  };
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check and initiate scheduled calls with enhanced frequency-based logic
 * Should be run via cron every 15 minutes
 */
export async function checkAndInitiateCalls(): Promise<void> {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday

  console.log(`\n[Scheduler] Running at ${now.toISOString()}`);
  console.log(`[Scheduler] Time: ${hour}:${minute.toString().padStart(2, '0')}, Day: ${dayOfWeek}`);

  // Only run during appropriate hours (9am - 8pm)
  if (hour < 9 || hour >= 20) {
    console.log('[Scheduler] Outside calling hours (9am-8pm), skipping');
    return;
  }

  // Find residents eligible for calls
  const residents = await prisma.resident.findMany({
    where: {
      status: 'active',
      callStatus: 'active', // NEW: Check callStatus
      callConsent: true,
      phoneNumber: { not: null },
      OR: [
        { unavailableUntil: null },
        { unavailableUntil: { lte: now } }, // Unavailability period has passed
      ],
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
  const skipReasons: Record<string, number> = {};

  for (const resident of residents) {
    try {
      // Calculate scheduling context
      const context = await calculateSchedulingContext(resident.id);

      // Check if resident is due for a call
      if (!context.isDue) {
        console.log(`[Scheduler] Skipping ${resident.firstName} - ${context.reason}`);
        skippedCount++;
        skipReasons[context.reason] = (skipReasons[context.reason] || 0) + 1;
        continue;
      }

      // Check if resident has been called very recently (safety check)
      const lastCall = resident.calls[0];
      if (lastCall && lastCall.endedAt && hoursSince(lastCall.endedAt) < 8) {
        const reason = 'Called too recently (< 8 hours ago)';
        console.log(`[Scheduler] Skipping ${resident.firstName} - ${reason}`);
        skippedCount++;
        skipReasons[reason] = (skipReasons[reason] || 0) + 1;
        continue;
      }

      // Check preferred times (with drift allowance for overdue calls)
      const allowDrift = context.daysSinceLastCall >= resident.maxDaysBetweenCalls;
      if (!isPreferredTime(resident.preferredCallTimes, hour, minute, dayOfWeek, allowDrift)) {
        const reason = allowDrift
          ? 'Not in preferred time window (even with drift allowance)'
          : 'Not in preferred time window';
        console.log(`[Scheduler] Skipping ${resident.firstName} - ${reason}`);
        skippedCount++;
        skipReasons[reason] = (skipReasons[reason] || 0) + 1;
        continue;
      }

      // All checks passed - initiate call
      console.log(`[Scheduler] ✅ Initiating call to ${resident.firstName}...`);
      console.log(`[Scheduler]    Context: ${context.reason}`);
      console.log(`[Scheduler]    Calls this week: ${context.callsMadeThisWeek}/${context.targetCallsThisWeek}`);
      console.log(`[Scheduler]    Days since last call: ${context.daysSinceLastCall}`);

      // Build call context (outbound mode)
      const callContext = await buildCallContext(resident.id, {
        isInbound: false,
        callTime: new Date(),
      });

      // Create call record
      const call = await prisma.call.create({
        data: {
          residentId: resident.id,
          callNumber: callContext.metadata.callNumber,
          isFirstCall: callContext.metadata.isFirstCall,
          status: 'initiating',
          direction: 'OUTBOUND',
          scheduledAt: new Date(),
          contextUsed: callContext.dynamicVariables as any,
        },
      });

      // Initiate call with Retell
      const retellResponse = await initiateCall({
        residentId: resident.id,
        phoneNumber: resident.phoneNumber!,
        dynamicVariables: callContext.dynamicVariables,
        metadata: {
          dbCallId: call.id,
          residentId: resident.id,
          callNumber: callContext.metadata.callNumber,
          isFirstCall: callContext.metadata.isFirstCall,
        },
      });

      // Update call with Retell call ID and update resident's last call date
      await prisma.call.update({
        where: { id: call.id },
        data: {
          retellCallId: retellResponse.call_id,
        },
      });

      // Update resident's lastOutboundCallDate
      await prisma.resident.update({
        where: { id: resident.id },
        data: {
          lastOutboundCallDate: new Date(),
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
  if (Object.keys(skipReasons).length > 0) {
    console.log(`   - Skip reasons:`);
    Object.entries(skipReasons).forEach(([reason, count]) => {
      console.log(`     • ${reason}: ${count}`);
    });
  }
  console.log(`   - Total processed: ${residents.length}\n`);
}

/**
 * Update a resident's next suggested call date
 * Should be called after each completed call
 */
export async function updateNextSuggestedCallDate(residentId: string): Promise<void> {
  const resident = await prisma.resident.findUnique({
    where: { id: residentId },
    select: {
      targetCallsPerWeek: true,
      minDaysBetweenCalls: true,
      preferredCallTimes: true,
      lastOutboundCallDate: true,
      lastInboundCallDate: true,
    },
  });

  if (!resident) {
    return;
  }

  const lastCallDate =
    resident.lastOutboundCallDate && resident.lastInboundCallDate
      ? new Date(Math.max(
          new Date(resident.lastOutboundCallDate).getTime(),
          new Date(resident.lastInboundCallDate).getTime()
        ))
      : resident.lastOutboundCallDate || resident.lastInboundCallDate || null;

  if (!lastCallDate) {
    // No previous call, suggest in minDays
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + resident.minDaysBetweenCalls);

    await prisma.resident.update({
      where: { id: residentId },
      data: { nextSuggestedCallDate: nextDate },
    });
    return;
  }

  // Calculate next suggested date based on frequency
  const daysPerCall = 7 / resident.targetCallsPerWeek;
  const nextDate = new Date(lastCallDate);
  nextDate.setDate(nextDate.getDate() + Math.max(resident.minDaysBetweenCalls, Math.floor(daysPerCall)));

  await prisma.resident.update({
    where: { id: residentId },
    data: { nextSuggestedCallDate: nextDate },
  });
}
