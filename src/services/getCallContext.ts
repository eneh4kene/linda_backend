/**
 * GET CALL CONTEXT
 *
 * Fetches all relevant memory layer data for a resident and formats it
 * for injection into the Retell prompt.
 */

import { prisma } from '../lib/prisma';

export interface CallContextData {
  resident: any;
  pattern: any;
  lastCallState: any;
  upcomingEvents: any[];
  callbacks: any[];
}

/**
 * Fetches all context needed for a call with a resident
 */
export async function getCallContext(residentId: string): Promise<CallContextData> {
  // Fetch resident with pattern
  const resident = await prisma.resident.findUnique({
    where: { id: residentId },
    include: {
      pattern: true,
      facility: true,
    },
  });

  if (!resident) {
    throw new Error(`Resident not found: ${residentId}`);
  }

  // Get last call state
  const lastCallState = await prisma.callState.findFirst({
    where: { residentId },
    orderBy: { recordedAt: 'desc' },
  });

  // Get upcoming events
  const upcomingEvents = await prisma.anticipatedEvent.findMany({
    where: {
      residentId,
      status: 'upcoming',
      shouldAskAbout: true,
    },
    orderBy: { eventDate: 'asc' },
    take: 5,
  });

  // Get active callbacks
  const callbacks = await prisma.callback.findMany({
    where: {
      residentId,
      stillLands: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  return {
    resident,
    pattern: resident.pattern,
    lastCallState,
    upcomingEvents,
    callbacks,
  };
}

/**
 * Formats context data into a string for prompt injection
 */
export function formatContextForPrompt(data: CallContextData): string {
  const name = data.resident.preferredName || data.resident.firstName;
  let context = `# MEMORY CONTEXT FOR ${name.toUpperCase()}\n\n`;

  // Resident Pattern
  if (data.pattern) {
    context += `## Conversational Profile\n\n`;

    // Baseline traits
    if (data.pattern.typicalEnergy || data.pattern.typicalTone || data.pattern.typicalReceptiveness) {
      context += `**Baseline traits:**\n`;
      if (data.pattern.typicalEnergy) context += `- Energy: ${data.pattern.typicalEnergy}\n`;
      if (data.pattern.typicalTone) context += `- Tone: ${data.pattern.typicalTone}\n`;
      if (data.pattern.typicalReceptiveness) context += `- Receptiveness: ${data.pattern.typicalReceptiveness}\n`;
      context += `\n`;
    }

    // Warmup pattern
    if (data.pattern.usuallyNeedsWarmup) {
      context += `**Warmup pattern:**\n`;
      context += `- Usually needs ${data.pattern.typicalWarmupMinutes || 5}-10 minutes to open up\n`;
      if (data.pattern.warmupNotes) {
        context += `- ${data.pattern.warmupNotes}\n`;
      }
      context += `\n`;
    }

    // Personality summary
    if (data.pattern.personalitySummary) {
      context += `**About ${name}:**\n${data.pattern.personalitySummary}\n\n`;
    }

    // What works
    const approaches = data.pattern.approachesThatWork as string[];
    if (approaches && approaches.length > 0) {
      context += `**Approaches that work well:**\n`;
      approaches.forEach(a => context += `- ${a}\n`);
      context += `\n`;
    }

    // What to avoid
    const toAvoid = data.pattern.approachesToAvoid as string[];
    if (toAvoid && toAvoid.length > 0) {
      context += `**Approaches to avoid:**\n`;
      toAvoid.forEach(a => context += `- ${a}\n`);
      context += `\n`;
    }

    // Favorite topics
    const topics = data.pattern.favoriteTopics as string[];
    if (topics && topics.length > 0) {
      context += `**Topics ${name} loves:**\n`;
      topics.forEach(t => context += `- ${t}\n`);
      context += `\n`;
    }

    // Sensitive topics
    const sensitive = data.pattern.sensitiveTopics as string[];
    if (sensitive && sensitive.length > 0) {
      context += `**Topics to handle gently:**\n`;
      sensitive.forEach(t => context += `- ${t}\n`);
      context += `\n`;
    }

    // Conversational preferences
    const prefs = data.pattern.conversationalPreferences as any;
    if (prefs && Object.keys(prefs).length > 0) {
      context += `**Conversational style preferences:**\n`;
      if (prefs.pace) context += `- Pace: ${prefs.pace}\n`;
      if (prefs.depth) context += `- Depth: ${prefs.depth}\n`;
      if (prefs.humour) context += `- Humor: ${prefs.humour}\n`;
      if (prefs.reciprocity) context += `- Reciprocity: ${prefs.reciprocity}\n`;
      if (prefs.games) context += `- Games: ${prefs.games}\n`;
      if (prefs.structure) context += `- Structure: ${prefs.structure}\n`;
      context += `\n`;
    }
  }

  // Last Call State
  if (data.lastCallState) {
    const daysAgo = Math.floor(
      (Date.now() - new Date(data.lastCallState.recordedAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    context += `## Last Call (${daysAgo} ${daysAgo === 1 ? 'day' : 'days'} ago)\n\n`;

    if (data.lastCallState.energyLevel || data.lastCallState.emotionalTone || data.lastCallState.receptiveness) {
      context += `**How they were:**\n`;
      if (data.lastCallState.energyLevel) context += `- Energy: ${data.lastCallState.energyLevel}\n`;
      if (data.lastCallState.emotionalTone) context += `- Tone: ${data.lastCallState.emotionalTone}\n`;
      if (data.lastCallState.receptiveness) context += `- Receptiveness: ${data.lastCallState.receptiveness}\n`;
      context += `\n`;
    }

    const topicsEngaged = data.lastCallState.topicsEngaged as string[];
    if (topicsEngaged && topicsEngaged.length > 0) {
      context += `**Topics that sparked engagement:**\n`;
      topicsEngaged.slice(0, 5).forEach(t => context += `- ${t}\n`);
      context += `\n`;
    }

    const emotionalPeaks = data.lastCallState.emotionalPeaks as any[];
    if (emotionalPeaks && emotionalPeaks.length > 0) {
      context += `**Emotional moments:**\n`;
      emotionalPeaks.forEach((peak: any) => {
        context += `- ${peak.type}: ${peak.context}\n`;
      });
      context += `\n`;
    }

    if (data.lastCallState.notes) {
      context += `**Notes from last call:**\n${data.lastCallState.notes}\n\n`;
    }
  }

  // Upcoming Events
  if (data.upcomingEvents && data.upcomingEvents.length > 0) {
    context += `## Things to Ask About\n\n`;

    data.upcomingEvents.forEach((event: any) => {
      const dateStr = event.eventDate
        ? ` (${new Date(event.eventDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })})`
        : '';

      context += `- **${event.description}**${dateStr}`;

      if (event.emotionalTone && event.emotionalTone !== 'neutral') {
        context += ` [${event.emotionalTone}]`;
      }

      context += `\n`;
    });

    context += `\n`;
  }

  // Callbacks
  if (data.callbacks && data.callbacks.length > 0) {
    context += `## Inside Jokes & Callbacks\n\n`;
    context += `These are references from past conversations that ${name} will recognize and enjoy:\n\n`;

    data.callbacks.forEach((callback: any) => {
      context += `- **[${callback.callbackType}]** ${callback.content}\n`;

      if (callback.context) {
        context += `  Context: ${callback.context}\n`;
      }

      if (callback.usageNotes) {
        context += `  Usage: ${callback.usageNotes}\n`;
      }

      context += `\n`;
    });
  }

  // Communication notes (from resident profile)
  if (data.resident.communicationNotes) {
    context += `## Communication Notes\n\n${data.resident.communicationNotes}\n\n`;
  }

  return context;
}

/**
 * Gets formatted context string ready for prompt injection
 */
export async function getFormattedCallContext(residentId: string): Promise<string> {
  const data = await getCallContext(residentId);
  return formatContextForPrompt(data);
}
