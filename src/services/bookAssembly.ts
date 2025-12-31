import { prisma } from '../lib/prisma';
import { claude } from '../lib/claude';

export interface SelectedStory {
  segmentId: string;
  title: string;
  pageAllocation: number;
  layoutType: 'standard' | 'rich' | 'short' | 'chapter_5_message';
  sequenceRationale: string;
}

export interface BookChapter {
  chapterNumber: number;
  category: string;
  title: string;
  pageStart: number;
  pageEnd: number;
  stories: SelectedStory[];
  chapterIntroBrief: string;
}

export interface BookAssembly {
  residentId: string;
  residentName: string;
  bookTier: 'minimal' | 'thin' | 'standard' | 'full';
  totalPages: number;
  chapters: BookChapter[];
  excludedSegments: Array<{
    segmentId: string;
    reason: string;
  }>;
  editorialNotes: string;
  specialHandling: Array<{
    segmentId: string;
    flag: string;
    note: string;
  }>;
}

const CHAPTER_METADATA: Record<string, { title: string; order: number }> = {
  childhood: { title: 'Where I Come From', order: 1 },
  career: { title: 'The Life I Built', order: 2 },
  family: { title: 'What I Loved', order: 3 },
  relationships: { title: 'What I Loved', order: 3 },
  hobbies: { title: 'What I Loved', order: 3 },
  wisdom: { title: 'What I Learned', order: 4 },
  health: { title: 'What I Learned', order: 4 },
  places: { title: 'The Life I Built', order: 2 },
};

const EDITORIAL_DIRECTOR_PROMPT = `You are an Editorial Director for Life Story Book production. Your job is to take a resident's collected stories and design the optimal book structure.

## Your Task

Given a set of story segments for a resident, you will:
1. Select which stories to include
2. Determine chapter structure
3. Allocate page counts
4. Sequence stories within chapters
5. Confirm the book tier

## Book Tiers

**Full Book (50 pages)**
- 15+ quality stories
- All chapters represented
- Rich Chapter 5 with multiple messages
- Premium presentation

**Standard Book (40 pages)**
- 10-14 quality stories
- Most chapters represented
- At least one Chapter 5 element

**Thin Book (24-30 pages)**
- 6-9 quality stories
- Core chapters only
- Must have Chapter 5 content
- Frame honestly in intro

**Minimal Book (16-20 pages)**
- Under 6 quality stories
- Single narrative arc
- Every story matters

## Selection Criteria

When choosing stories, prioritize:
1. **Quality score 4-5** — Always include exceptional material
2. **Chapter coverage** — Aim for balance across life stages
3. **Variety** — Mix tones (joy, loss, humor, wisdom)
4. **Relational content** — Stories about people they loved
5. **Chapter 5 material** — Non-negotiable if it exists

When cutting stories:
1. **Quality 1-2** — Never include
2. **Redundant** — If two stories cover same ground, keep better one
3. **Quality 3** — Include only if needed for chapter coverage

## Page Allocation

**Rich Story (4+ min audio, quality 5, narrative arc):** 3-4 pages
**Standard Story (2-4 min audio, quality 4):** 2 pages
**Short Story (under 2 min, quality 3-4):** 2 pages
**Chapter 5 Message:** 2 pages per recipient

## Sequencing Within Chapters

Order stories by:
1. **Chronological** where natural (especially Chapter 1)
2. **Emotional arc** — build to strongest material
3. **Thematic connection** — related stories adjacent

## Output Format

Return ONLY valid JSON with this structure:
{
  "selectedStories": [
    {
      "segmentId": "uuid",
      "title": "Brief evocative title (2-5 words)",
      "pageAllocation": 2,
      "layoutType": "standard",
      "sequenceRationale": "Why this story in this position",
      "chapterCategory": "childhood"
    }
  ],
  "excludedSegments": [
    {
      "segmentId": "uuid",
      "reason": "Quality 2, no clear narrative"
    }
  ],
  "editorialNotes": "Overall assessment and recommendations",
  "specialHandling": [
    {
      "segmentId": "uuid",
      "flag": "chapter_5_message",
      "note": "Message to Sophie — confirm with family given context"
    }
  ]
}

## Critical Rules

1. **Chapter 5 is non-negotiable** if it exists in the material
2. **Don't pad** — better tight 30 pages than bloated 50 pages
3. **Respect the material** — if someone told 6 stories, those were their choice
4. **Flag sensitivity** — don't make judgment calls, flag for human review
5. **Think about the reader** — the family member opening this after loss

Now review the segments and create the book structure.`;

/**
 * Assemble a book structure from a resident's story segments
 * Uses Claude Editorial Director agent to make selection and ordering decisions
 */
export async function assembleBook(residentId: string, targetTier?: string): Promise<BookAssembly> {
  // Get resident
  const resident = await prisma.resident.findUnique({
    where: { id: residentId },
  });

  if (!resident) {
    throw new Error(`Resident not found: ${residentId}`);
  }

  // Get all quality segments (3+)
  const segments = await prisma.storySegment.findMany({
    where: {
      residentId,
      audioClipStatus: 'completed',
      audioClipUrl: { not: null },
      storyQualityScore: { gte: 3 },
    },
    orderBy: [{ category: 'asc' }, { storyQualityScore: 'desc' }],
  });

  if (segments.length === 0) {
    throw new Error('No quality segments available for book assembly');
  }

  // Format segments for Claude
  const segmentsData = segments.map((s) => ({
    segmentId: s.id,
    category: s.category,
    qualityScore: s.storyQualityScore,
    qualityRationale: s.qualityRationale,
    transcriptPreview: s.transcriptText.substring(0, 200),
    durationSeconds: Math.floor((s.endTimeMs - s.startTimeMs) / 1000),
    emotionalTone: s.emotionalTone,
    pullQuotes: s.pullQuotes,
    sensitivityFlags: s.sensitivityFlags,
    keyPeople: s.keyPeople,
    keyPlaces: s.keyPlaces,
  }));

  const prompt = `${EDITORIAL_DIRECTOR_PROMPT}

## Resident Information
Name: ${resident.preferredName || resident.firstName}
Target Tier: ${targetTier || 'auto-determine'}

## Available Segments (${segments.length} stories)
${JSON.stringify(segmentsData, null, 2)}

IMPORTANT: Respond with ONLY valid JSON. Do not include any explanation, preamble, or markdown formatting. Start your response directly with the opening brace {.`;

  // Call Claude to make editorial decisions
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

  let editorialDecision;
  try {
    // Try parsing as-is first
    editorialDecision = JSON.parse(jsonText);
  } catch (error) {
    console.error('Failed to parse Claude response:', error);
    console.error('Response text (first 1000 chars):', jsonText.substring(0, 1000));

    // Try with a more lenient parser - use eval with safety checks
    // This is a fallback for Claude responses that have minor formatting issues
    try {
      // Remove any truly problematic control characters
      const cleaned = jsonText.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
      editorialDecision = JSON.parse(cleaned);
    } catch (secondError) {
      throw new Error(`Failed to parse editorial decision even after cleanup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Determine tier based on selection
  const selectedCount = editorialDecision.selectedStories?.length || 0;
  let bookTier: BookAssembly['bookTier'] = 'minimal';
  let totalPages = 16;

  if (selectedCount >= 15) {
    bookTier = 'full';
    totalPages = 50;
  } else if (selectedCount >= 10) {
    bookTier = 'standard';
    totalPages = 40;
  } else if (selectedCount >= 6) {
    bookTier = 'thin';
    totalPages = 24;
  }

  // Group selected stories by chapter
  const chapterGroups: Record<string, any[]> = {};
  (editorialDecision.selectedStories || []).forEach((story: any) => {
    const cat = story.chapterCategory || 'other';
    if (!chapterGroups[cat]) {
      chapterGroups[cat] = [];
    }
    chapterGroups[cat].push(story);
  });

  // Build chapters with page allocation
  let currentPage = 3; // Start after cover and intro
  const chapters: BookChapter[] = Object.entries(chapterGroups)
    .sort(([catA], [catB]) => {
      const orderA = CHAPTER_METADATA[catA]?.order || 99;
      const orderB = CHAPTER_METADATA[catB]?.order || 99;
      return orderA - orderB;
    })
    .map(([category, stories], index) => {
      const metadata = CHAPTER_METADATA[category] || {
        title: category.charAt(0).toUpperCase() + category.slice(1),
        order: 99,
      };

      const chapterStart = currentPage;
      currentPage += 1; // Chapter opener page

      const formattedStories: SelectedStory[] = stories.map((s: any) => ({
        segmentId: s.segmentId,
        title: s.title,
        pageAllocation: s.pageAllocation || 2,
        layoutType: s.layoutType || 'standard',
        sequenceRationale: s.sequenceRationale || '',
      }));

      // Add up page allocations
      const storyPages = formattedStories.reduce((sum, s) => sum + s.pageAllocation, 0);
      currentPage += storyPages;

      return {
        chapterNumber: index + 1,
        category,
        title: metadata.title,
        pageStart: chapterStart,
        pageEnd: currentPage - 1,
        stories: formattedStories,
        chapterIntroBrief: `Stories from ${resident.preferredName || resident.firstName}'s ${category}`,
      };
    });

  return {
    residentId,
    residentName: resident.preferredName || resident.firstName,
    bookTier,
    totalPages,
    chapters,
    excludedSegments: editorialDecision.excludedSegments || [],
    editorialNotes: editorialDecision.editorialNotes || '',
    specialHandling: editorialDecision.specialHandling || [],
  };
}
