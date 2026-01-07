import { prisma } from '../lib/prisma';
import { CallContext, RetellDynamicVariables } from '../types';
import { getFormattedCallContext } from './getCallContext';

/**
 * Format relative time reference
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 6) {
    return 'earlier today';
  } else if (diffHours < 24) {
    return 'today';
  } else if (diffDays === 1) {
    return 'yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else if (diffDays < 14) {
    return 'last week';
  } else if (diffDays < 30) {
    return `${Math.floor(diffDays / 7)} weeks ago`;
  } else {
    return 'a while ago';
  }
}

/**
 * Format category name for display
 */
function formatCategoryName(category: string): string {
  const categoryMap: Record<string, string> = {
    family: 'Family',
    career: 'Career History',
    hobbies: 'Hobbies & Interests',
    places: 'Places',
    events: 'Life Events',
    preferences: 'Preferences',
    personality: 'Personality',
    health: 'Health',
    daily_life: 'Daily Life',
  };
  return categoryMap[category] || category;
}

/**
 * Format array as JSON string for Retell (all dynamic variables must be strings)
 */
function toJsonString(value: any): string {
  if (!value) return '';
  return JSON.stringify(value);
}

/**
 * Build call context with dynamic variables for Retell
 * Updated to provide individual variables for retell_prompt.md
 */
export async function buildCallContext(
  residentId: string,
  options?: { isInbound?: boolean; callTime?: Date }
): Promise<CallContext> {
  // 1. Fetch resident with facility
  const resident = await prisma.resident.findUnique({
    where: { id: residentId },
    include: {
      facility: true,
    },
  });

  if (!resident) {
    throw new Error(`Resident not found: ${residentId}`);
  }

  // 2. Fetch active memories (prioritize by mentions and recency)
  const memories = await prisma.memory.findMany({
    where: {
      residentId,
      isActive: true,
    },
    orderBy: [
      { timesMentioned: 'desc' },
      { lastMentionedAt: 'desc' },
    ],
    take: 30, // Limit to prevent context overflow
  });

  // 3. Fetch last completed call
  const lastCall = await prisma.call.findFirst({
    where: {
      residentId,
      status: 'completed',
    },
    orderBy: {
      endedAt: 'desc',
    },
  });

  // 4. Fetch last call state (for energy, tone, notes)
  const lastCallState = await prisma.callState.findFirst({
    where: {
      residentId,
    },
    orderBy: {
      recordedAt: 'desc',
    },
    include: {
      call: {
        select: {
          endedAt: true,
        },
      },
    },
  });

  // 5. Fetch resident pattern (Memory Layer Phase 1)
  const pattern = await prisma.residentPattern.findUnique({
    where: { residentId },
  });

  // 6. Fetch upcoming events (Memory Layer Phase 1)
  const upcomingEvents = await prisma.anticipatedEvent.findMany({
    where: {
      residentId,
      status: 'upcoming',
      shouldAskAbout: true,
    },
    orderBy: [
      { eventDate: 'asc' },
      { createdAt: 'desc' },
    ],
    take: 5,
  });

  // 7. Fetch callbacks (Memory Layer Phase 1)
  const callbacks = await prisma.callback.findMany({
    where: {
      residentId,
      stillLands: true,
    },
    orderBy: [
      { timesUsed: 'desc' },
      { createdAt: 'desc' },
    ],
    take: 10,
  });

  // 8. Count total completed calls
  const completedCallsCount = await prisma.call.count({
    where: {
      residentId,
      status: 'completed',
    },
  });

  const callNumber = completedCallsCount + 1;
  const isFirstCall = completedCallsCount === 0;

  // 9. Format memories as string (Retell requires all dynamic variables to be strings)
  const formattedMemories = memories
    .map((memory) => {
      const categoryLabel = formatCategoryName(memory.category);
      return { category: categoryLabel, content: memory.value };
    })
    .map((m) => `- [${m.category}] ${m.content}`)
    .join('\n');

  // 10. Format last call summary
  let lastCallSummary = 'This is your first conversation with them.';
  let lastCallDate = '';
  if (lastCall && lastCall.endedAt) {
    const relativeTime = formatRelativeTime(lastCall.endedAt);
    const summaryText = lastCall.summary || 'We had a nice chat';
    const topics = lastCall.topicsDiscussed
      ? Array.isArray(lastCall.topicsDiscussed)
        ? (lastCall.topicsDiscussed as string[]).join(', ')
        : ''
      : '';

    lastCallSummary = `We spoke ${relativeTime}. ${summaryText}`;
    if (topics) {
      lastCallSummary += `. We discussed: ${topics}`;
    }
    lastCallDate = lastCall.endedAt.toISOString();
  }

  // 11. Get memory layer context (legacy format for backward compatibility)
  let memoryLayerContext = '';
  try {
    memoryLayerContext = await getFormattedCallContext(residentId);
  } catch (error) {
    console.error('Error fetching memory layer context:', error);
    // Continue without memory layer context if it fails
  }

  // 12. Determine mode flags
  const isInbound = options?.isInbound || false;
  const isOutbound = !isInbound;

  // 13. Format inbound-specific context
  let callTime = '';
  let callContext = '';
  let recentContext = '';

  if (isInbound && options?.callTime) {
    const hour = options.callTime.getHours();
    const minute = options.callTime.getMinutes();
    callTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

    // Infer potential call context based on time and recent events
    if (hour >= 22 || hour <= 5) {
      callContext = 'Late night call - may signal anxiety, sleeplessness, or distress';
    } else if (hour >= 6 && hour <= 9) {
      callContext = 'Early morning call';
    }

    // Check for recent anticipated events that might explain the call
    const recentEvents = await prisma.anticipatedEvent.findMany({
      where: {
        residentId,
        OR: [
          {
            eventDate: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
              lte: new Date(),
            },
          },
          {
            status: 'upcoming',
            eventDate: {
              gte: new Date(),
              lte: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Next 2 days
            },
          },
        ],
      },
      orderBy: { eventDate: 'desc' },
      take: 3,
    });

    if (recentEvents.length > 0) {
      recentContext = recentEvents
        .map((e) => `${e.description} ${e.eventDate ? `(${formatRelativeTime(e.eventDate)})` : ''}`)
        .join('; ');
    }
  }

  // 14. Build dynamic variables (all fields as strings per Retell requirements)
  const dynamicVariables: RetellDynamicVariables = {
    // Basic resident info
    preferred_name: resident.preferredName || resident.firstName,
    full_name: `${resident.firstName}${resident.lastName ? ' ' + resident.lastName : ''}`,
    room_number: resident.roomNumber || '',
    communication_notes: resident.communicationNotes || '',

    // Memories & preferences
    memories: formattedMemories,
    favorite_topics: resident.favoriteTopics || '',
    avoid_topics: resident.avoidTopics || '',

    // Last call context
    last_call_summary: lastCallSummary,
    last_call_date: lastCallDate,
    last_call_energy: lastCallState?.energyLevel || '',
    last_call_tone: lastCallState?.emotionalTone || '',
    last_call_notes: lastCallState?.notes || '',

    // Memory Layer - Resident Pattern
    personality_summary: pattern?.personalitySummary || '',
    approaches_that_work: toJsonString(pattern?.approachesThatWork),
    approaches_to_avoid: toJsonString(pattern?.approachesToAvoid),
    usually_needs_warmup: pattern?.usuallyNeedsWarmup ? 'true' : '',
    warmup_notes: pattern?.warmupNotes || '',
    typical_warmup_minutes: pattern?.typicalWarmupMinutes?.toString() || '',
    conversational_preferences: toJsonString(pattern?.conversationalPreferences),
    typical_energy: pattern?.typicalEnergy || '',
    typical_tone: pattern?.typicalTone || '',
    typical_receptiveness: pattern?.typicalReceptiveness || '',
    key_people: toJsonString(pattern?.keyPeople),
    temporal_patterns: toJsonString(pattern?.temporalPatterns),
    sensitive_topics: toJsonString(pattern?.sensitiveTopics),

    // Memory Layer - Events & Callbacks
    upcoming_events: toJsonString(
      upcomingEvents.map((e) => ({
        description: e.description,
        event_date: e.eventDate?.toISOString(),
        event_type: e.eventType,
        should_ask_about: e.shouldAskAbout,
        emotional_tone: e.emotionalTone,
      }))
    ),
    callbacks: toJsonString(
      callbacks.map((c) => ({
        callback_type: c.callbackType,
        content: c.content,
        context: c.context,
        usage_notes: c.usageNotes,
      }))
    ),

    // Inbound-specific
    call_time: callTime,
    call_context: callContext,
    recent_context: recentContext,

    // Mode flags
    mode_outbound: isOutbound ? 'true' : '',
    mode_inbound: isInbound ? 'true' : '',

    // Legacy field (backward compatibility)
    memory_layer_context: memoryLayerContext,
  };

  return {
    dynamicVariables,
    metadata: {
      callNumber,
      isFirstCall,
      memoriesCount: memories.length,
    },
    rawContext: {
      memories,
      resident,
      lastCall,
      completedCallsCount,
    },
  };
}
