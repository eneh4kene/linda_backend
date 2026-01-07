/**
 * POST-CALL ANALYSIS PIPELINE - Phase 1
 *
 * Processes call transcripts to extract:
 * 1. Call State (vibe, energy, what worked)
 * 2. Enhanced Memories (with emotional valence)
 * 3. Anticipated Events (things to follow up on)
 * 4. Callbacks (inside jokes, relationship texture)
 */

import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../lib/prisma';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// =============================================================================
// MAIN PIPELINE
// =============================================================================

export async function processCall(callId: string): Promise<void> {
  const call = await prisma.call.findUnique({
    where: { id: callId },
    include: {
      resident: {
        include: {
          facility: true,
        },
      },
    },
  });

  if (!call || call.processed) {
    console.log(`Call ${callId} already processed or not found`);
    return;
  }

  if (!call.transcript || !call.transcriptText) {
    console.log(`Call ${callId} has no transcript`);
    return;
  }

  const resident = call.resident;
  console.log(`Processing call ${callId} for ${resident.preferredName || resident.firstName}`);

  try {
    // Step 1: Extract call state
    console.log('  → Extracting call state...');
    const callState = await extractCallState(call.transcriptText, resident, call);
    await prisma.callState.create({ data: callState });

    // Step 2: Extract anticipated events
    console.log('  → Extracting anticipated events...');
    const events = await extractAnticipatedEvents(call.transcriptText, resident, call);
    if (events.length > 0) {
      await prisma.anticipatedEvent.createMany({ data: events });
    }

    // Step 3: Extract callbacks
    console.log('  → Extracting callbacks...');
    const callbacks = await extractCallbacks(call.transcriptText, resident, call);
    if (callbacks.length > 0) {
      await prisma.callback.createMany({ data: callbacks });
    }

    // Step 4: Update resident patterns (if we have enough data)
    console.log('  → Updating resident patterns...');
    await updateResidentPatterns(resident.id);

    // Mark call as processed
    await prisma.call.update({
      where: { id: callId },
      data: {
        processed: true,
        processedAt: new Date(),
      },
    });

    console.log(`✓ Completed processing call ${callId}`);
  } catch (error) {
    console.error(`Error processing call ${callId}:`, error);
    throw error;
  }
}

// =============================================================================
// STEP 1: EXTRACT CALL STATE
// =============================================================================

async function extractCallState(
  transcriptText: string,
  resident: any,
  call: any
): Promise<any> {
  const prompt = `You are analyzing a phone conversation between Linda (an AI companion) and ${resident.preferredName || resident.firstName} (an elderly care home resident).

Analyze the conversation and extract the following signals. Be specific and evidence-based.

TRANSCRIPT:
${transcriptText}

---

Return a JSON object with:

{
  "energy_level": "high" | "medium" | "low",
  "emotional_tone": "bright" | "neutral" | "melancholy" | "anxious" | "irritable",
  "receptiveness": "very_open" | "open" | "guarded" | "tired" | "resistant",
  "warmup_observed": true | false,
  "warmup_duration_minutes": number | null,
  "responded_well_to": string[],
  "didnt_land": string[],
  "topics_engaged": string[],
  "topics_avoided": string[],
  "emotional_peaks": [{"type": string, "context": string}],
  "contextual_factors": string[],
  "notes": string
}

Be concise but specific. Base everything on evidence from the transcript.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  const textContent = response.content[0];
  if (textContent.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  const result = JSON.parse(extractJSON(textContent.text));

  return {
    callId: call.id,
    residentId: resident.id,
    energyLevel: result.energy_level,
    emotionalTone: result.emotional_tone,
    receptiveness: result.receptiveness,
    warmupObserved: result.warmup_observed || false,
    warmupDurationMinutes: result.warmup_duration_minutes,
    respondedWellTo: result.responded_well_to || [],
    didntLand: result.didnt_land || [],
    topicsEngaged: result.topics_engaged || [],
    topicsAvoided: result.topics_avoided || [],
    emotionalPeaks: result.emotional_peaks || [],
    contextualFactors: result.contextual_factors || [],
    notes: result.notes,
  };
}

// =============================================================================
// STEP 2: EXTRACT ANTICIPATED EVENTS
// =============================================================================

async function extractAnticipatedEvents(
  transcriptText: string,
  resident: any,
  call: any
): Promise<any[]> {
  const prompt = `Analyze this conversation for upcoming events or things Linda should follow up on with ${resident.preferredName || resident.firstName}.

TRANSCRIPT:
${transcriptText}

---

Extract events as JSON array:

[
  {
    "event_type": "visit" | "appointment" | "birthday" | "anniversary" | "holiday" | "other",
    "description": string,
    "event_date": "YYYY-MM-DD" | null,
    "recurring": "weekly" | "monthly" | "yearly" | null,
    "recurring_details": object | null,
    "emotional_tone": "positive" | "negative" | "anxious" | "neutral",
    "should_ask_about": boolean
  }
]

Include both future events AND past events mentioned that Linda should ask about.
If no events, return empty array.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  });

  const textContent = response.content[0];
  if (textContent.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  const events = JSON.parse(extractJSON(textContent.text));

  return events.map((e: any) => ({
    residentId: resident.id,
    sourceCallId: call.id,
    eventType: e.event_type,
    description: e.description,
    eventDate: e.event_date ? new Date(e.event_date) : null,
    recurring: e.recurring,
    recurringDetails: e.recurring_details,
    emotionalTone: e.emotional_tone,
    shouldAskAbout: e.should_ask_about !== false,
  }));
}

// =============================================================================
// STEP 3: EXTRACT CALLBACKS
// =============================================================================

async function extractCallbacks(
  transcriptText: string,
  resident: any,
  call: any
): Promise<any[]> {
  const prompt = `Analyze this conversation for potential "callbacks" - inside jokes, running references, phrases, or moments that Linda could reference in future calls with ${resident.preferredName || resident.firstName}.

These create relationship texture - the feeling that you have shared history.

TRANSCRIPT:
${transcriptText}

---

Extract callbacks as JSON array:

[
  {
    "callback_type": "joke" | "phrase" | "story" | "preference" | "tease",
    "content": string,
    "context": string,
    "usage_notes": string
  }
]

Be selective. Only extract things that genuinely could work as callbacks.
If none, return empty array.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  });

  const textContent = response.content[0];
  if (textContent.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  const callbacks = JSON.parse(extractJSON(textContent.text));

  return callbacks.map((c: any) => ({
    residentId: resident.id,
    sourceCallId: call.id,
    callbackType: c.callback_type,
    content: c.content,
    context: c.context,
    usageNotes: c.usage_notes,
  }));
}

// =============================================================================
// STEP 4: UPDATE AGGREGATED PATTERNS
// =============================================================================

async function updateResidentPatterns(residentId: string): Promise<void> {
  const callStates = await prisma.callState.findMany({
    where: { residentId },
    orderBy: { recordedAt: 'desc' },
    take: 20,
  });

  if (callStates.length < 2) {
    console.log('  → Not enough data to derive patterns yet');
    return;
  }

  const prompt = `You have data from ${callStates.length} phone conversations with an elderly care home resident. Analyze for patterns.

CALL STATES (most recent first):
${JSON.stringify(callStates, null, 2)}

---

Derive aggregated patterns. Return JSON:

{
  "typical_energy": "high" | "medium" | "low",
  "typical_tone": "bright" | "neutral" | "melancholy",
  "typical_receptiveness": "very_open" | "open" | "guarded",
  "usually_needs_warmup": boolean,
  "typical_warmup_minutes": number | null,
  "warmup_notes": string | null,
  "approaches_that_work": string[],
  "approaches_to_avoid": string[],
  "favorite_topics": string[],
  "sensitive_topics": string[],
  "temporal_patterns": [{"pattern": string, "description": string}],
  "conversational_preferences": {
    "pace": "slow" | "medium" | "fast",
    "depth": "surface" | "moderate" | "loves_going_deep",
    "humour": "not_interested" | "enjoys_gentle" | "loves_banter",
    "reciprocity": "prefers_focus_on_them" | "appreciates_when_linda_shares",
    "games": "not_interested" | "sometimes" | "enjoys",
    "structure": "prefers_wandering" | "appreciates_some_structure"
  },
  "personality_summary": string
}

Base patterns on evidence. The personality_summary should read like friendly notes.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  const textContent = response.content[0];
  if (textContent.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  const patterns = JSON.parse(extractJSON(textContent.text));

  await prisma.residentPattern.upsert({
    where: { residentId },
    create: {
      residentId,
      typicalEnergy: patterns.typical_energy,
      typicalTone: patterns.typical_tone,
      typicalReceptiveness: patterns.typical_receptiveness,
      usuallyNeedsWarmup: patterns.usually_needs_warmup || false,
      typicalWarmupMinutes: patterns.typical_warmup_minutes,
      warmupNotes: patterns.warmup_notes,
      approachesThatWork: patterns.approaches_that_work || [],
      approachesToAvoid: patterns.approaches_to_avoid || [],
      favoriteTopics: patterns.favorite_topics || [],
      sensitiveTopics: patterns.sensitive_topics || [],
      temporalPatterns: patterns.temporal_patterns || [],
      conversationalPreferences: patterns.conversational_preferences || {},
      personalitySummary: patterns.personality_summary,
      callsAnalyzed: callStates.length,
    },
    update: {
      typicalEnergy: patterns.typical_energy,
      typicalTone: patterns.typical_tone,
      typicalReceptiveness: patterns.typical_receptiveness,
      usuallyNeedsWarmup: patterns.usually_needs_warmup || false,
      typicalWarmupMinutes: patterns.typical_warmup_minutes,
      warmupNotes: patterns.warmup_notes,
      approachesThatWork: patterns.approaches_that_work || [],
      approachesToAvoid: patterns.approaches_to_avoid || [],
      favoriteTopics: patterns.favorite_topics || [],
      sensitiveTopics: patterns.sensitive_topics || [],
      temporalPatterns: patterns.temporal_patterns || [],
      conversationalPreferences: patterns.conversational_preferences || {},
      personalitySummary: patterns.personality_summary,
      callsAnalyzed: callStates.length,
    },
  });

  console.log('  → Patterns updated');
}

// =============================================================================
// UTILITIES
// =============================================================================

function extractJSON(text: string): string {
  // Extract JSON from response that might have markdown code blocks
  const jsonMatch = text.match(/```json?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) return jsonMatch[1];

  // Try to find JSON array or object
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) return arrayMatch[0];

  const objectMatch = text.match(/\{[\s\S]*\}/);
  if (objectMatch) return objectMatch[0];

  return text;
}
