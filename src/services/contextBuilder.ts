import { prisma } from '../lib/prisma';
import { CallContext, RetellDynamicVariables } from '../types';

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
 * Build call context with dynamic variables for Retell
 */
export async function buildCallContext(residentId: string): Promise<CallContext> {
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

  // 4. Count total completed calls
  const completedCallsCount = await prisma.call.count({
    where: {
      residentId,
      status: 'completed',
    },
  });

  const callNumber = completedCallsCount + 1;
  const isFirstCall = completedCallsCount === 0;

  // 5. Format memories as string (Retell requires all dynamic variables to be strings)
  const formattedMemories = memories
    .map((memory: { category: string; value: string }) =>
      `${formatCategoryName(memory.category)}: ${memory.value}`
    )
    .join('\n');

  // 6. Format last call summary
  let lastCallSummary = 'This is our first conversation.';
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
  }

  // 7. Build dynamic variables
  const dynamicVariables: RetellDynamicVariables = {
    preferred_name: resident.preferredName || resident.firstName,
    full_name: `${resident.firstName}${resident.lastName ? ' ' + resident.lastName : ''}`,
    room_number: resident.roomNumber || 'unknown',
    memories: formattedMemories,
    favorite_topics: resident.favoriteTopics || '',
    avoid_topics: resident.avoidTopics || '',
    communication_notes: resident.communicationNotes || '',
    last_call_summary: lastCallSummary,
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
