import { claude } from '../lib/claude';
import { prisma } from '../lib/prisma';
import { ExtractedMemory } from '../types';

const MEMORY_EXTRACTION_PROMPT = `You are analyzing a conversation between Linda (an AI companion) and {{residentName}}, an elderly care home resident.

Extract factual information about the resident that should be remembered for future conversations.

## What to Extract:
- Family members (names, relationships, details)
- Spouse/partner information
- Children, grandchildren
- Career and work history
- Places lived or visited
- Hobbies and interests
- Important life events
- Preferences (likes, dislikes)
- Personality observations
- Health mentions (only what they voluntarily share)
- Pets
- Daily routines

## What NOT to Extract:
- Small talk ("I'm fine", "nice weather")
- Anything Linda says
- Vague or uncertain information
- Medical details that seem private

## Output Format:
Return a JSON array:
[
  {
    "category": "family",
    "key": "spouse_name",
    "value": "Arthur, married 52 years, passed away in 2022",
    "confidence": 0.95
  }
]

Categories: family, career, hobbies, places, events, preferences, personality, health, daily_life

If no memories can be extracted, return: []

## Transcript:
{{transcript}}`;

/**
 * Extract memories from a conversation transcript using Claude
 */
export async function extractMemories(
  _residentId: string,
  transcript: string,
  residentName: string
): Promise<ExtractedMemory[]> {
  try {
    const prompt = MEMORY_EXTRACTION_PROMPT.replace('{{residentName}}', residentName).replace(
      '{{transcript}}',
      transcript
    );

    const response = await claude.messages.create({
      model: 'claude-3-5-sonnet-20241022',
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

    // Extract JSON from response (handle markdown code blocks)
    let jsonText = text;
    if (text.startsWith('```')) {
      const match = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
      if (match) {
        jsonText = match[1];
      }
    }

    const memories: ExtractedMemory[] = JSON.parse(jsonText);

    // Validate the structure
    if (!Array.isArray(memories)) {
      console.warn('Claude response was not an array, returning empty memories');
      return [];
    }

    // Filter out invalid memories
    return memories.filter(
      (m) =>
        m.category &&
        m.key &&
        m.value &&
        typeof m.confidence === 'number' &&
        m.confidence >= 0 &&
        m.confidence <= 1
    );
  } catch (error) {
    console.error('Error extracting memories:', error);
    // Don't throw - just return empty array to allow processing to continue
    return [];
  }
}

/**
 * Upsert memories into the database
 * If memory exists (same residentId + category + key), update it
 * Otherwise, create a new memory
 */
export async function upsertMemories(
  residentId: string,
  callId: string,
  memories: ExtractedMemory[]
): Promise<void> {
  for (const memory of memories) {
    try {
      // Check if memory exists
      const existing = await prisma.memory.findUnique({
        where: {
          residentId_category_key: {
            residentId,
            category: memory.category,
            key: memory.key,
          },
        },
      });

      if (existing) {
        // Update existing memory
        await prisma.memory.update({
          where: { id: existing.id },
          data: {
            value: memory.value,
            confidence: Math.max(existing.confidence, memory.confidence),
            timesMentioned: existing.timesMentioned + 1,
            lastMentionedAt: new Date(),
            sourceCallId: callId, // Update to latest call
          },
        });
        console.log(
          `Updated memory: ${memory.category}/${memory.key} (mentioned ${existing.timesMentioned + 1} times)`
        );
      } else {
        // Create new memory
        await prisma.memory.create({
          data: {
            residentId,
            sourceCallId: callId,
            category: memory.category,
            key: memory.key,
            value: memory.value,
            confidence: memory.confidence,
            timesMentioned: 1,
            firstMentionedAt: new Date(),
            lastMentionedAt: new Date(),
            isActive: true,
          },
        });
        console.log(`Created new memory: ${memory.category}/${memory.key}`);
      }
    } catch (error) {
      console.error(`Error upserting memory ${memory.category}/${memory.key}:`, error);
      // Continue with other memories
    }
  }
}
