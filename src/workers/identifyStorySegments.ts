import { claude } from '../lib/claude';

interface PullQuote {
  quote: string;
  rationale: string;
  rank: number; // 1 or 2 (most impactful first)
}

interface IdentifiedSegment {
  startTime: number; // seconds from call start
  endTime: number;
  duration: number;
  transcriptText: string;
  category: string;
  topic: string;
  emotionalTone: string;
  qualityScore: number; // 1-5 scale
  qualityRationale: string; // Why this score was assigned
  isCompleteStory: boolean;
  pullQuotes?: PullQuote[]; // 1-2 memorable quotes
  sensitivityFlags?: string[]; // family_estrangement, health_disclosure, end_of_life, trauma, living_persons, chapter_5_message
  keyPeople?: string[]; // Names mentioned
  keyPlaces?: string[]; // Places mentioned
  keyDates?: string[]; // Dates mentioned
  keyObjects?: string[]; // Significant objects
}

const SEGMENT_IDENTIFICATION_PROMPT = `You are the Transcript Analyst for Linda's Lifebook system, analyzing a conversation between Linda (an AI companion) and {{residentName}}, an elderly care home resident.

Your task is to identify meaningful story segments that could be included in a lifebook for the resident's family.

## What to Look For:

**Good Story Segments:**
- Personal anecdotes (meeting spouse, wedding day, first job, etc.)
- Family stories (children's births, family traditions, holidays)
- Career/work experiences
- Travel stories or places lived
- Hobbies and interests explained
- Life lessons or wisdom shared
- Emotional moments (joyful, reflective, proud)
- Complete narratives with beginning, middle, end
- Messages to family members (ONLY when resident explicitly addresses family)

**NOT Story Segments:**
- Small talk ("I'm fine", "nice weather")
- Simple yes/no answers
- Incomplete thoughts or fragments
- Linda's responses (only extract resident's stories)
- Purely factual exchanges without narrative

## Quality Scoring (1-5 scale):

**5 - Exceptional**: Emotionally rich, complete narrative arc, vivid details, highly quotable, print-ready
- Example: Full story with beginning/middle/end, strong emotional resonance, specific details

**4 - Strong**: Interesting story with good details, mostly complete, needs minor editing
- Example: Good anecdote but missing some context or ending feels rushed

**3 - Usable**: Decent content with some interesting elements, needs significant editing
- Example: Story is there but needs work to flesh out details or improve flow

**2 - Marginal**: Brief mention with minimal detail, may be worth keeping for context
- Example: Quick reference to an event without elaboration

**1 - Unusable**: Fragment, off-topic, or purely factual without narrative value
- Example: "I worked at a factory" with no further details

## Additional Extraction Requirements:

For each segment, also extract:

1. **Pull Quotes** (1-2 per segment, if any exist):
   - The most memorable, quotable phrases
   - Could be humorous, poignant, wise, or revealing
   - Include rationale for why it's impactful
   - Rank them (1 = most impactful)

2. **Sensitivity Flags** (mark any that apply):
   - **family_estrangement**: Strained/broken family relationships
   - **health_disclosure**: Detailed medical information
   - **end_of_life**: Death, dying, mortality discussions
   - **trauma**: Traumatic experiences (war, abuse, loss)
   - **living_persons**: Names specific living people who might need privacy
   - **chapter_5_message**: ONLY for explicit messages to family ("Tell my daughter...", "I want my son to know...")

3. **Key Details**:
   - **keyPeople**: Names of people mentioned (spouse, children, friends, colleagues)
   - **keyPlaces**: Specific locations (cities, countries, addresses, buildings)
   - **keyDates**: Time references (years, ages, "when I was 20", specific dates)
   - **keyObjects**: Significant objects mentioned (wedding ring, car model, family heirloom)

## CRITICAL: Chapter 5 Detection

**Chapter 5 is ONLY for direct messages to family members.** It requires:
- Explicit framing: "I want to tell my son...", "Tell my daughter...", "I hope my grandchildren know..."
- Direct address or clear intention to communicate to family
- NOT just talking about family or telling family stories
- This is a sacred space for final words and wisdom

If the resident is just reminiscing about family, use "family" category, NOT chapter_5_message flag.

## Output Format:

Return a JSON array of segments. Use the transcript timestamps to determine start/end times.

[
  {
    "startTime": 125.5,
    "endTime": 243.2,
    "duration": 117.7,
    "transcriptText": "The full text of what the resident said in this segment...",
    "category": "family",
    "topic": "meeting spouse",
    "emotionalTone": "joyful",
    "qualityScore": 5,
    "qualityRationale": "Complete narrative with vivid details about their first date, emotionally resonant, includes dialogue",
    "isCompleteStory": true,
    "pullQuotes": [
      {
        "quote": "I knew she was the one when she laughed at my terrible jokes",
        "rationale": "Charming, reveals character, emotionally warm",
        "rank": 1
      }
    ],
    "sensitivityFlags": [],
    "keyPeople": ["Mary", "John Smith"],
    "keyPlaces": ["Central Park", "New York"],
    "keyDates": ["1952", "summer"],
    "keyObjects": ["blue dress", "picnic basket"]
  }
]

**Categories:** family, career, places, hobbies, life_events, wisdom, childhood, relationships, health, daily_life

**Emotional Tones:** joyful, proud, reflective, nostalgic, sad, grateful, humorous, matter-of-fact

If no story segments are found, return: []

## Transcript (with timestamps):
{{transcript}}`;

/**
 * Identify story segments from a conversation transcript using Claude
 */
export async function identifyStorySegments(
  residentName: string,
  transcriptWithTimestamps: any[], // Retell format: [{role, content, timestamp}]
  audioDurationMs?: number // Optional audio duration to validate timestamps
): Promise<IdentifiedSegment[]> {
  try {
    // Format transcript for Claude
    const formattedTranscript = transcriptWithTimestamps
      .map((entry: any) => {
        const speaker = entry.role === 'agent' ? 'Linda' : residentName;
        const timestamp = entry.timestamp ? `[${entry.timestamp}s]` : '';
        return `${timestamp} ${speaker}: ${entry.content}`;
      })
      .join('\n');

    // Build the prompt with audio duration constraint if available
    let prompt = SEGMENT_IDENTIFICATION_PROMPT.replace('{{residentName}}', residentName).replace(
      '{{transcript}}',
      formattedTranscript
    );

    // Add audio duration constraint if available
    if (audioDurationMs) {
      const audioDurationSeconds = audioDurationMs / 1000;
      const durationConstraint = `\n\nIMPORTANT: The audio recording is exactly ${audioDurationSeconds.toFixed(2)} seconds long.
All timestamps (startTime and endTime) MUST be less than ${audioDurationSeconds.toFixed(2)} seconds.
Do not create segments with timestamps beyond the audio duration.`;
      prompt = prompt + durationConstraint;
    }

    const response = await claude.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Expected text response from Claude');
    }

    const text = content.text.trim();

    // Extract JSON from response (handle markdown code blocks and surrounding text)
    let jsonText = text;

    // First check for markdown code blocks
    if (text.includes('```')) {
      const match = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
      if (match) {
        jsonText = match[1].trim();
      }
    } else {
      // Look for JSON array in the response (might have explanatory text before/after)
      const arrayMatch = text.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        jsonText = arrayMatch[0];
      }
    }

    console.log(`Parsing JSON response (${jsonText.length} chars)`);
    const segments: IdentifiedSegment[] = JSON.parse(jsonText);

    console.log(`Parsed ${segments.length} raw segments from Claude`);

    // Validate the structure
    if (!Array.isArray(segments)) {
      console.warn('Claude response was not an array, returning empty segments');
      return [];
    }

    // Filter out invalid segments
    const validSegments = segments.filter(
      (s) =>
        typeof s.startTime === 'number' &&
        typeof s.endTime === 'number' &&
        s.transcriptText &&
        s.category &&
        typeof s.qualityScore === 'number' &&
        s.qualityScore >= 1 &&
        s.qualityScore <= 5 &&
        s.qualityRationale // Rationale is required
    );

    console.log(`Filtered to ${validSegments.length} valid segments`);
    if (validSegments.length > 0) {
      console.log(
        `Segment quality scores: ${validSegments.map((s) => s.qualityScore).join(', ')}`
      );
      console.log(
        `Pull quotes extracted: ${validSegments.filter((s) => s.pullQuotes && s.pullQuotes.length > 0).length}/${validSegments.length}`
      );
      console.log(
        `Sensitivity flags: ${validSegments.filter((s) => s.sensitivityFlags && s.sensitivityFlags.length > 0).length}/${validSegments.length}`
      );
    }

    // Validate and clamp timestamps if audio duration is provided
    if (audioDurationMs) {
      const audioDurationSeconds = audioDurationMs / 1000;
      let clamped = 0;
      let filtered = 0;

      const clampedSegments = validSegments
        .map((segment) => {
          // Clamp startTime to audio duration
          const originalStart = segment.startTime;
          const clampedStart = Math.min(segment.startTime, audioDurationSeconds);

          // Clamp endTime to audio duration
          const originalEnd = segment.endTime;
          const clampedEnd = Math.min(segment.endTime, audioDurationSeconds);

          if (originalStart !== clampedStart || originalEnd !== clampedEnd) {
            clamped++;
            console.log(
              `Clamped segment timestamps: ${originalStart.toFixed(2)}s-${originalEnd.toFixed(2)}s → ${clampedStart.toFixed(2)}s-${clampedEnd.toFixed(2)}s`
            );
          }

          return {
            ...segment,
            startTime: clampedStart,
            endTime: clampedEnd,
            duration: clampedEnd - clampedStart,
          };
        })
        .filter((segment) => {
          // Remove segments that are entirely outside the audio duration
          // or have become invalid (start >= end)
          if (segment.startTime >= audioDurationSeconds || segment.startTime >= segment.endTime) {
            filtered++;
            console.log(
              `Filtered out invalid segment: ${segment.startTime.toFixed(2)}s-${segment.endTime.toFixed(2)}s`
            );
            return false;
          }
          return true;
        });

      if (clamped > 0) {
        console.log(`⚠️  Clamped ${clamped} segment(s) to audio duration (${audioDurationSeconds.toFixed(2)}s)`);
      }
      if (filtered > 0) {
        console.log(`⚠️  Filtered out ${filtered} segment(s) outside audio duration`);
      }

      return clampedSegments;
    }

    return validSegments;
  } catch (error) {
    console.error('Error identifying story segments:', error);
    // Don't throw - just return empty array to allow processing to continue
    return [];
  }
}
