import { prisma } from '../lib/prisma';
import { claude } from '../lib/claude';
import { BookAssembly } from './bookAssembly';

export interface GeneratedStoryContent {
  segmentId: string;
  title: string;
  editedTranscript: string;
  primaryPullQuote: string;
  recordingNote: string;
  closingNote?: string;
}

export interface GeneratedChapterContent {
  chapterNumber: number;
  intro: string;
  stories: GeneratedStoryContent[];
}

export interface GeneratedBookContent {
  bookIntro: string;
  chapters: GeneratedChapterContent[];
  colophon: string;
}

const COPY_EDITOR_PROMPT = `You are a Copy Editor for Life Story Book production. Your job is to write all framing text and edit transcripts for publication.

## Your Voice

Warm and steady. Not sentimental, not clinical. Like a gentle hand on the shoulder.

- Short sentences. Direct.
- Second person where possible ("Before she was your mother...")
- Present tense for framing, past tense for stories
- No exclamation marks
- No clichés about memory, legacy, or "capturing moments"

## What You Write

### 1. Chapter Introductions

Each chapter needs a 2-3 sentence introduction that:
- Signals the theme without being heavy-handed
- Speaks directly to the reader
- Creates emotional space for what follows

**Templates by chapter:**

Chapter 1 (Where I Come From): "Before [she/he] was your [relationship], [she/he] was someone's [child/daughter/son]. These are the stories from that time."

Chapter 2 (The Life I Built): "This is the life [she/he] built. The work, the marriage, the home. What [she/he] made with [his/her] hands and years."

Chapter 3 (What I Loved): "What did [she/he] love? Who made [her/him] laugh? These are the stories of joy."

Chapter 4 (What I Learned): "Life teaches. Sometimes gently, sometimes not. These are the lessons [she/he] carried."

Chapter 5 (What I Want You to Know): "Some things are too important to leave unsaid. These are the words [she/he] wanted you to hear."

You may adapt these templates to fit the specific content, but maintain the tone.

### 2. Story Titles

Each story needs a title that:
- Is 2-5 words
- Evocative, not descriptive
- Often references a key detail or object

Examples:
- "Frank" (not "How I Met My Husband")
- "The Only Six" (not "The Cricket Match")
- "Grandma's Secret Cake" (not "Baking with Sophie")

### 3. Edited Transcripts

Transform raw transcripts into readable text:

**Remove:**
- Linda's prompts and questions (unless essential for context)
- False starts, "um", "uh", repeated phrases
- Timestamps and speaker labels
- Tangents that don't serve the story

**Keep:**
- The resident's exact words (don't "improve" their language)
- Natural speech patterns that convey personality
- Pauses indicated by "..." where emotionally significant
- Dialect or colloquialisms (don't standardize)

**Structure:**
- Break into paragraphs at natural pause points
- One idea per paragraph typically
- No paragraph longer than 4-5 sentences

### 4. Pull Quote Selection

From the extracted quotes, confirm the primary quote:
- Under 20 words ideal
- Emotionally resonant
- Works on the page without context
- Not the most dramatic moment necessarily — sometimes the quiet line hits harder

### 5. Recording Metadata

"Recorded [date]. [Name] was [age]."

### 6. Book Introduction

Standard text with personalization:

"This book holds the stories of [Name] — told in [her/his] own voice, in [her/his] own words, at [her/his] own pace.

Each story is accompanied by an audio recording. Scan the QR code with your phone's camera to hear [her/his] voice. Some stories are long; some are short. All of them are real.

There's no right way to read this book. You might start at the beginning. You might flip to the chapter that calls to you. You might return to the same story again and again.

The blank spaces are for you. Add photos. Write notes. Make this book yours, the way [she/he] made these stories [hers/his]."

### 7. Colophon

"This book was created with Linda, an AI companion who listens.

The stories within were recorded between [start date] and [end date] at [care home name].

Audio recordings are preserved at linda.ai/book/[code]

Printed in the United Kingdom
[Edition], [Year]"

## Output Format

Return ONLY valid JSON with this structure:
{
  "bookIntro": "This book holds the stories of...",
  "chapters": [
    {
      "chapterNumber": 1,
      "intro": "Before she was your mother...",
      "stories": [
        {
          "segmentId": "uuid",
          "title": "The Trawler's Daughter",
          "editedTranscript": "My father worked the trawlers...",
          "primaryPullQuote": "We come from people who worked hard.",
          "recordingNote": "Recorded 15th November 2024. Margaret was 87.",
          "closingNote": null
        }
      ]
    }
  ],
  "colophon": "This book was created with Linda..."
}

## Critical Rules

1. **Never invent** — Every word attributed to the resident must come from their transcript
2. **Never editorialize** — Don't interpret what they meant. Present what they said.
3. **Keep their voice** — If they said "me mum" not "my mother", keep it.
4. **Less is more** — A 300-word edited transcript is usually better than 600 words.
5. **The reader is grieving** — Or will be. Write with that awareness.

Now generate the book content.`;

/**
 * Generate all text content for a book using the Copy Editor agent
 */
export async function generateBookContent(
  residentId: string,
  assembly: BookAssembly
): Promise<GeneratedBookContent> {
  // Get resident
  const resident = await prisma.resident.findUnique({
    where: { id: residentId },
  });

  if (!resident) {
    throw new Error(`Resident not found: ${residentId}`);
  }

  // Get all selected segments
  const allSegmentIds = assembly.chapters.flatMap((ch) => ch.stories.map((s) => s.segmentId));

  const segments = await prisma.storySegment.findMany({
    where: {
      id: { in: allSegmentIds },
    },
    include: {
      call: {
        select: {
          endedAt: true,
        },
      },
    },
  });

  // Create a map for easy lookup
  const segmentMap = new Map(segments.map((s) => [s.id, s]));

  // Format data for Claude
  const chaptersData = assembly.chapters.map((ch) => ({
    chapterNumber: ch.chapterNumber,
    category: ch.category,
    title: ch.title,
    stories: ch.stories.map((story) => {
      const segment = segmentMap.get(story.segmentId);
      if (!segment) return null;

      return {
        segmentId: story.segmentId,
        transcriptText: segment.transcriptText,
        pullQuotes: segment.pullQuotes,
        emotionalTone: segment.emotionalTone,
        recordedDate: segment.call.endedAt
          ? new Date(segment.call.endedAt).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })
          : 'Unknown',
        suggestedTitle: story.title,
      };
    }).filter(Boolean),
  }));

  // Get first and last call dates
  const allCalls = await prisma.call.findMany({
    where: { residentId, status: 'completed' },
    orderBy: { endedAt: 'asc' },
  });

  const startDate = allCalls[0]?.endedAt
    ? new Date(allCalls[0].endedAt).toLocaleDateString('en-GB', {
        month: 'long',
        year: 'numeric',
      })
    : 'Unknown';

  const endDate = allCalls[allCalls.length - 1]?.endedAt
    ? new Date(allCalls[allCalls.length - 1].endedAt).toLocaleDateString('en-GB', {
        month: 'long',
        year: 'numeric',
      })
    : 'Unknown';

  const prompt = `${COPY_EDITOR_PROMPT}

## Resident Information
Name: ${resident.preferredName || resident.firstName}
Book Tier: ${assembly.bookTier}
Recording Period: ${startDate} - ${endDate}
Care Home: ${resident.facilityId ? 'Facility Name' : 'Unknown'}

## Chapters and Stories
${JSON.stringify(chaptersData, null, 2)}

IMPORTANT: Respond with ONLY valid JSON. Do not include any explanation, preamble, or markdown formatting. Start your response directly with the opening brace {.`;

  // Call Claude to generate content
  // Note: Claude 3.5 Haiku has 8192 token limit, plenty for full book generation
  const response = await claude.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 8192,
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

  // Parse response
  let jsonText = content.text.trim();

  // Try to extract JSON from markdown code blocks
  if (jsonText.includes('```')) {
    const match = jsonText.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
    if (match) {
      jsonText = match[1].trim();
    }
  }

  // Try to find JSON starting with { if there's preamble text
  if (!jsonText.startsWith('{')) {
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }
  }

  let generatedContent;
  try {
    // Try parsing as-is first
    generatedContent = JSON.parse(jsonText);
  } catch (error) {
    console.error('Failed to parse Claude response:', error);
    console.error('Response text (first 1000 chars):', jsonText.substring(0, 1000));

    // Try with a more lenient parser - remove control characters
    try {
      const cleaned = jsonText.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
      generatedContent = JSON.parse(cleaned);
    } catch (secondError) {
      throw new Error(`Failed to parse generated content even after cleanup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return {
    bookIntro: generatedContent.bookIntro,
    chapters: generatedContent.chapters,
    colophon: generatedContent.colophon,
  };
}
