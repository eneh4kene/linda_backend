// =============================================================================
// LINDA POST-CALL ANALYSIS PIPELINE
// =============================================================================
// Runs after each call to extract signals, stories, and memories.
// Populates call_states, memories, stories, callbacks, anticipated_events.
// Periodically updates resident_patterns (aggregated insights).
// =============================================================================

import { db } from './database';
import { anthropic } from './anthropic';
import { getEmbedding, cosineSimilarity } from './embeddings';

// =============================================================================
// MAIN PIPELINE
// =============================================================================

export async function processCall(callId: string): Promise<void> {
  const call = await db.calls.findById(callId);
  if (!call || call.processed) return;

  const resident = await db.residents.findById(call.resident_id);
  const transcript = call.transcript_raw;

  console.log(`Processing call ${callId} for ${resident.preferred_name}`);

  // Step 1: Extract call state (vibe, what worked, etc.)
  const callState = await extractCallState(transcript, resident, call);
  await db.callStates.create(callState);

  // Step 2: Extract memories (facts, people, preferences, events)
  const memories = await extractMemories(transcript, resident, call);
  await db.memories.createMany(memories);

  // Step 3: Extract stories for Life Story Book
  const stories = await extractStories(transcript, resident, call);
  for (const story of stories) {
    await processStory(story, resident);
  }

  // Step 4: Extract anticipated events (things to follow up on)
  const events = await extractAnticipatedEvents(transcript, resident, call);
  await db.anticipatedEvents.createMany(events);

  // Step 5: Extract callbacks (inside jokes, running references)
  const callbacks = await extractCallbacks(transcript, resident, call);
  await db.callbacks.createMany(callbacks);

  // Step 6: Update aggregated patterns
  await updateResidentPatterns(resident.id);

  // Mark call as processed
  await db.calls.update(callId, { processed: true, processed_at: new Date() });

  console.log(`Completed processing call ${callId}`);
}


// =============================================================================
// STEP 1: EXTRACT CALL STATE
// =============================================================================

async function extractCallState(
  transcript: any,
  resident: any,
  call: any
): Promise<CallState> {
  
  const prompt = `You are analyzing a phone conversation between Linda (an AI companion) and ${resident.preferred_name} (an elderly care home resident).

Analyze the conversation and extract the following signals. Be specific and evidence-based.

TRANSCRIPT:
${formatTranscript(transcript)}

---

Return a JSON object with:

{
  "energy_level": "high" | "medium" | "low",
  // How much energy/vitality did they have? Were they animated or subdued?
  
  "emotional_tone": "bright" | "neutral" | "melancholy" | "anxious" | "irritable",
  // What was their overall emotional tone?
  
  "receptiveness": "very_open" | "open" | "guarded" | "tired" | "resistant",
  // How receptive were they to conversation? Did they share freely?
  
  "warmup_observed": true | false,
  // Did they start guarded/quiet but open up as the call progressed?
  
  "warmup_duration_minutes": number | null,
  // If warmup observed, roughly how many minutes until they warmed up?
  
  "responded_well_to": string[],
  // What conversational approaches got good responses?
  // Options: "playfulness", "deep_questions", "silence", "stories_about_others", 
  //          "sensory_questions", "historical_weaving", "game_offer", "gentle_teasing",
  //          "following_tangents", "asking_about_family", "asking_about_past"
  
  "didnt_land": string[],
  // What didn't get a good response or was deflected?
  // Same options as above, plus: "change_of_topic", "probing_question"
  
  "topics_engaged": string[],
  // Specific topics they were animated about (e.g., "Arthur", "the factory", "Susan's visit")
  
  "topics_avoided": string[],
  // Topics they deflected or shut down
  
  "emotional_peaks": [
    {"type": "joy" | "sadness" | "anger" | "fear" | "love" | "nostalgia" | "pride", "context": string}
  ],
  // Moments of strong emotion and what triggered them
  
  "contextual_factors": string[],
  // Any context that might explain their state (e.g., "mentioned poor sleep", "Susan cancelled visit")
  
  "notes": string
  // Any other observations that might be useful for future calls
}

Be concise but specific. Base everything on evidence from the transcript.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }]
  });

  const result = JSON.parse(extractJSON(response.content[0].text));

  return {
    call_id: call.id,
    resident_id: resident.id,
    recorded_at: new Date(),
    ...result
  };
}


// =============================================================================
// STEP 2: EXTRACT MEMORIES
// =============================================================================

async function extractMemories(
  transcript: any,
  resident: any,
  call: any
): Promise<Memory[]> {
  
  // Get existing memories to avoid duplicates
  const existingMemories = await db.memories.findByResident(resident.id);
  const existingSummary = existingMemories.map(m => `- ${m.content}`).join('\n');

  const prompt = `You are analyzing a phone conversation to extract memories for Linda to remember about ${resident.preferred_name}.

EXISTING MEMORIES (don't duplicate these):
${existingSummary || 'None yet'}

---

TRANSCRIPT:
${formatTranscript(transcript)}

---

Extract NEW information learned in this conversation. Return a JSON array of memories:

[
  {
    "memory_type": "fact" | "preference" | "person" | "moment" | "joke" | "event" | "sentiment",
    // fact: Factual information (e.g., "Worked at the shipyard for 30 years")
    // preference: Likes/dislikes (e.g., "Doesn't like talking about politics")
    // person: Info about someone (e.g., "Daughter Susan visits on Sundays")
    // moment: Notable moment in this call (e.g., "Laughed so hard about the turkey story")
    // joke: Something funny that could be referenced again
    // event: Upcoming or past event (e.g., "Doctor appointment next Tuesday")
    // sentiment: A feeling or attitude (e.g., "Worried about being a burden")
    
    "category": string | null,
    // For facts: "family", "work", "childhood", "health", "daily_life", "history", "home"
    
    "content": string,
    // The actual memory, phrased as a fact about them
    // Good: "Met Arthur at a dance in 1958"
    // Bad: "She said she met Arthur at a dance"
    
    "context": string | null,
    // How/when this came up
    
    "person_name": string | null,
    // If memory_type is "person", the person's name
    
    "person_relationship": string | null,
    // If memory_type is "person", their relationship
    
    "emotional_valence": "positive" | "negative" | "neutral" | "mixed"
  }
]

Only extract genuinely new information. Be specific. Don't infer beyond what they actually said.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 3000,
    messages: [{ role: 'user', content: prompt }]
  });

  const memories = JSON.parse(extractJSON(response.content[0].text));

  return memories.map((m: any) => ({
    resident_id: resident.id,
    source_call_id: call.id,
    ...m
  }));
}


// =============================================================================
// STEP 3: EXTRACT STORIES
// =============================================================================

async function extractStories(
  transcript: any,
  resident: any,
  call: any
): Promise<Story[]> {
  
  const prompt = `You are analyzing a conversation to extract STORIES for ${resident.preferred_name}'s Life Story Book.

A story is a narrative about a specific experience, event, or period of their life. Look for:
- Complete narratives with beginning, middle, end
- Vivid details: names, places, dates, sensory memories
- Emotional resonance: how they felt, what it meant
- First-hand experience, not summaries

---

TRANSCRIPT:
${formatTranscript(transcript)}

---

Extract stories as a JSON array:

[
  {
    "title": string,
    // A descriptive title, e.g., "Meeting Arthur at the Dance"
    
    "summary": string,
    // 2-3 sentence summary
    
    "full_text": string,
    // The story in their voice, cleaned up for readability.
    // Remove Linda's questions. Remove false starts and filler.
    // But PRESERVE their exact phrases, dialect, and personality.
    // Write in first person as if they're telling it directly.
    
    "category": "childhood" | "romance" | "career" | "family" | "war" | "travel" | "hardship" | "achievement" | "tradition" | "humour" | "loss" | "friendship",
    
    "subcategory": string | null,
    // e.g., "wedding", "first_job", "birth_of_child"
    
    "era": string | null,
    // e.g., "1950s", "wartime", "1960s"
    
    "people_mentioned": [{"name": string, "relationship": string}],
    
    "places_mentioned": [{"name": string, "type": string}],
    // type: "hometown", "workplace", "school", "holiday", "home"
    
    "dates_mentioned": [{"year": number | null, "event": string}],
    
    "completeness": "complete" | "partial" | "fragment",
    // complete: Full story with clear arc
    // partial: Most of a story but missing pieces
    // fragment: Just a glimpse, could be expanded
    
    "emotional_significance": "high" | "medium" | "low",
    // How meaningful does this seem to be to them?
    
    "sensory_richness": 1-5,
    // How much sensory detail (smells, sounds, textures, visuals)?
    
    "transcript_start_index": number,
    "transcript_end_index": number
    // Approximate positions in transcript (for reference)
  }
]

Only extract actual stories they told. Don't invent or embellish. If no stories were shared, return an empty array.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }]
  });

  const stories = JSON.parse(extractJSON(response.content[0].text));

  return stories.map((s: any) => ({
    resident_id: resident.id,
    source_call_id: call.id,
    ...s
  }));
}


// Process individual story (deduplication, etc.)
async function processStory(story: Story, resident: any): Promise<void> {
  // Generate embedding for similarity check
  const embedding = await getEmbedding(story.summary + ' ' + story.full_text);
  
  // Find similar existing stories
  const existingStories = await db.stories.findByResident(resident.id);
  
  for (const existing of existingStories) {
    if (!existing.embedding) continue;
    
    const similarity = cosineSimilarity(embedding, existing.embedding);
    
    if (similarity > 0.85) {
      // This is likely a retelling
      console.log(`Story "${story.title}" appears to be retelling of "${existing.title}"`);
      
      // Decide which version is better
      const newScore = scoreStoryQuality(story);
      const existingScore = scoreStoryQuality(existing);
      
      if (newScore > existingScore) {
        // New version is better - make it canonical
        await db.stories.update(existing.id, { 
          is_canonical: false, 
          canonical_story_id: null // Will be set to new story
        });
        story.is_canonical = true;
        story.story_hash = existing.story_hash || generateStoryHash(story);
      } else {
        // Existing version is better - link new to existing
        story.is_canonical = false;
        story.canonical_story_id = existing.id;
        story.story_hash = existing.story_hash;
      }
      
      break;
    }
  }
  
  // If no duplicate found, this is a new canonical story
  if (story.is_canonical === undefined) {
    story.is_canonical = true;
    story.story_hash = generateStoryHash(story);
  }
  
  // Save with embedding
  await db.stories.create({ ...story, embedding });
}


function scoreStoryQuality(story: Story): number {
  let score = 0;
  
  // Completeness
  if (story.completeness === 'complete') score += 30;
  else if (story.completeness === 'partial') score += 15;
  else score += 5;
  
  // Length (proxy for detail)
  score += Math.min(story.full_text.length / 50, 20);
  
  // Sensory richness
  score += (story.sensory_richness || 1) * 5;
  
  // Emotional significance
  if (story.emotional_significance === 'high') score += 15;
  else if (story.emotional_significance === 'medium') score += 10;
  else score += 5;
  
  // Entities (specificity)
  score += (story.people_mentioned?.length || 0) * 3;
  score += (story.places_mentioned?.length || 0) * 2;
  score += (story.dates_mentioned?.length || 0) * 2;
  
  return score;
}


// =============================================================================
// STEP 4: EXTRACT ANTICIPATED EVENTS
// =============================================================================

async function extractAnticipatedEvents(
  transcript: any,
  resident: any,
  call: any
): Promise<AnticipatedEvent[]> {
  
  const prompt = `Analyze this conversation for upcoming events or things Linda should follow up on with ${resident.preferred_name}.

TRANSCRIPT:
${formatTranscript(transcript)}

---

Extract events as JSON array:

[
  {
    "event_type": "visit" | "appointment" | "birthday" | "anniversary" | "holiday" | "other",
    
    "description": string,
    // e.g., "Susan visiting on Sunday", "Doctor appointment Tuesday"
    
    "event_date": "YYYY-MM-DD" | null,
    // Specific date if known or inferable
    
    "recurring": "weekly" | "monthly" | "yearly" | null,
    
    "recurring_details": object | null,
    // e.g., {"day_of_week": "Sunday"} for weekly visits
    
    "emotional_tone": "positive" | "negative" | "anxious" | "neutral",
    // How do they seem to feel about this event?
    
    "should_ask_about": boolean
    // Should Linda follow up after this event?
  }
]

Include both future events AND past events mentioned that Linda should ask about (e.g., "Doctor appointment was yesterday").`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }]
  });

  const events = JSON.parse(extractJSON(response.content[0].text));

  return events.map((e: any) => ({
    resident_id: resident.id,
    source_call_id: call.id,
    ...e
  }));
}


// =============================================================================
// STEP 5: EXTRACT CALLBACKS
// =============================================================================

async function extractCallbacks(
  transcript: any,
  resident: any,
  call: any
): Promise<Callback[]> {
  
  const prompt = `Analyze this conversation for potential "callbacks" - inside jokes, running references, phrases, or moments that Linda could reference in future calls with ${resident.preferred_name}.

These create relationship texture - the feeling that you have shared history.

TRANSCRIPT:
${formatTranscript(transcript)}

---

Extract callbacks as JSON array:

[
  {
    "callback_type": "joke" | "phrase" | "story" | "preference" | "tease",
    // joke: Something funny that could be referenced
    // phrase: A phrase they use that Linda could echo
    // story: A memorable story to reference back to
    // preference: A stated preference Linda can play with
    // tease: Something Linda could gently tease them about
    
    "content": string,
    // The callback itself
    // e.g., "The burnt turkey Christmas" or "Arthur saying 'that's the Blackpool in me'"
    
    "context": string,
    // How it came up
    
    "usage_notes": string
    // When/how Linda might use this
    // e.g., "Reference when talking about Christmas" or "Use when they're being self-deprecating"
  }
]

Be selective. Only extract things that genuinely could work as callbacks - moments that landed, things they repeated or emphasized, genuine jokes that got a reaction.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }]
  });

  const callbacks = JSON.parse(extractJSON(response.content[0].text));

  return callbacks.map((c: any) => ({
    resident_id: resident.id,
    source_call_id: call.id,
    ...c
  }));
}


// =============================================================================
// STEP 6: UPDATE AGGREGATED PATTERNS
// =============================================================================

async function updateResidentPatterns(residentId: string): Promise<void> {
  // Get all call states for this resident
  const callStates = await db.callStates.findByResident(residentId);
  
  if (callStates.length < 2) {
    // Not enough data to derive patterns yet
    return;
  }

  const prompt = `You have data from ${callStates.length} phone conversations with an elderly care home resident. Analyze for patterns.

CALL STATES (most recent first):
${JSON.stringify(callStates.slice(0, 20), null, 2)}

---

Derive aggregated patterns. Return JSON:

{
  "typical_energy": "high" | "medium" | "low",
  // Their usual energy level across calls
  
  "typical_tone": "bright" | "neutral" | "melancholy",
  // Their usual emotional baseline
  
  "typical_receptiveness": "very_open" | "open" | "guarded",
  // How open they usually are
  
  "usually_needs_warmup": boolean,
  // Do they consistently need time to warm up?
  
  "typical_warmup_minutes": number | null,
  // If warmup needed, how long typically?
  
  "warmup_notes": string | null,
  // Any notes on warmup pattern
  
  "approaches_that_work": string[],
  // Approaches that consistently get good responses
  
  "approaches_to_avoid": string[],
  // Approaches that consistently don't land
  
  "favorite_topics": string[],
  // Topics they consistently engage with
  
  "sensitive_topics": string[],
  // Topics they consistently avoid or get upset about
  
  "temporal_patterns": [
    {"pattern": string, "description": string}
  ],
  // Any time-based patterns observed
  // e.g., {"pattern": "better_mornings", "description": "More energy in morning calls"}
  
  "conversational_preferences": {
    "pace": "slow" | "medium" | "fast",
    "depth": "surface" | "moderate" | "loves_going_deep",
    "humour": "not_interested" | "enjoys_gentle" | "loves_banter",
    "reciprocity": "prefers_focus_on_them" | "appreciates_when_linda_shares",
    "games": "not_interested" | "sometimes" | "enjoys",
    "structure": "prefers_wandering" | "appreciates_some_structure"
  },
  
  "personality_summary": string
  // A 2-4 sentence summary of who they are conversationally
  // This should read like notes from a friend, not clinical observations
  // e.g., "Margaret is warm and chatty once she warms up (usually 5-10 mins). 
  //        She loves talking about Arthur and lights up with sensory questions about the past.
  //        She doesn't enjoy games but appreciates when Linda shares observations about others."
}

Base patterns on evidence across multiple calls. Note the confidence based on how consistent the pattern is.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }]
  });

  const patterns = JSON.parse(extractJSON(response.content[0].text));

  // Also aggregate key people from memories
  const memories = await db.memories.findByResident(residentId);
  const peopleMemories = memories.filter(m => m.memory_type === 'person');
  const keyPeople = peopleMemories.map(m => ({
    name: m.person_name,
    relationship: m.person_relationship,
    notes: m.content
  }));

  await db.residentPatterns.upsert(residentId, {
    ...patterns,
    key_people: keyPeople,
    calls_analyzed: callStates.length,
    updated_at: new Date()
  });
}


// =============================================================================
// UTILITIES
// =============================================================================

function formatTranscript(transcript: any): string {
  // Convert Retell transcript format to readable text
  if (Array.isArray(transcript)) {
    return transcript
      .map(turn => `${turn.speaker}: ${turn.text}`)
      .join('\n');
  }
  return JSON.stringify(transcript);
}

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

function generateStoryHash(story: Story): string {
  // Simple hash for story identification
  const content = `${story.category}:${story.era}:${story.people_mentioned?.map(p => p.name).join(',')}`;
  return Buffer.from(content).toString('base64').slice(0, 32);
}


// =============================================================================
// WEBHOOK HANDLER
// =============================================================================

export async function handleRetellWebhook(req: Request): Promise<Response> {
  const { event, call } = req.body;

  if (event === 'call_ended' || event === 'call_analyzed') {
    // Store raw call data
    const callRecord = await db.calls.create({
      resident_id: call.metadata?.resident_id,
      call_type: call.direction === 'inbound' ? 'inbound' : 'outbound',
      started_at: new Date(call.start_timestamp),
      ended_at: new Date(call.end_timestamp),
      duration_seconds: call.duration_seconds,
      retell_call_id: call.call_id,
      audio_url: call.recording_url,
      transcript_raw: call.transcript
    });

    // Queue for async processing
    await queue.add('process_call', { callId: callRecord.id });
  }

  return new Response('OK', { status: 200 });
}


// =============================================================================
// SCHEDULED JOBS
// =============================================================================

// Run nightly to update patterns and clean up
export async function nightlyMaintenance(): Promise<void> {
  // Update patterns for all active residents
  const residents = await db.residents.findActive();
  
  for (const resident of residents) {
    try {
      await updateResidentPatterns(resident.id);
    } catch (error) {
      console.error(`Failed to update patterns for ${resident.id}:`, error);
    }
  }

  // Mark past events as passed
  await db.anticipatedEvents.markPassed();

  // Archive old call states (keep last 50 per resident)
  await db.callStates.archiveOld(50);
}