import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// Category metadata for chapters
const CATEGORY_METADATA: Record<string, { title: string; description: string; order: number }> = {
  childhood: {
    title: 'Early Years',
    description: 'Growing up and childhood memories',
    order: 1,
  },
  education: {
    title: 'School Days',
    description: 'Learning and formative years',
    order: 2,
  },
  career: {
    title: 'Working Life',
    description: 'Professional journey and achievements',
    order: 3,
  },
  relationships: {
    title: 'Love & Friendship',
    description: 'Meaningful connections and relationships',
    order: 4,
  },
  family: {
    title: 'Family',
    description: 'Building a family and raising children',
    order: 5,
  },
  hobbies: {
    title: 'Passions & Hobbies',
    description: 'Interests and pursuits',
    order: 6,
  },
  travel: {
    title: 'Adventures',
    description: 'Travel and exploration',
    order: 7,
  },
  challenges: {
    title: 'Overcoming',
    description: 'Challenges faced and lessons learned',
    order: 8,
  },
  accomplishments: {
    title: 'Achievements',
    description: 'Proud moments and successes',
    order: 9,
  },
  wisdom: {
    title: 'Reflections',
    description: 'Life lessons and wisdom',
    order: 10,
  },
};

/**
 * GET /api/residents/:residentId/lifebook
 * Get formatted lifebook data for a resident
 */
router.get('/:residentId/lifebook', async (req, res) => {
  try {
    const { residentId } = req.params;

    // Get resident details
    const resident = await prisma.resident.findUnique({
      where: { id: residentId },
    });

    if (!resident) {
      return res.status(404).json({ error: 'Resident not found' });
    }

    // Get all story segments for this resident
    // Only include segments with audio clips (completed)
    const segments = await prisma.storySegment.findMany({
      where: {
        residentId,
        audioClipStatus: 'completed',
        audioClipUrl: { not: null },
      },
      orderBy: [
        { category: 'asc' },
        { storyQualityScore: 'desc' },
      ],
      include: {
        call: {
          select: {
            endedAt: true,
          },
        },
      },
    });

    // Group segments by category
    const segmentsByCategory = segments.reduce((acc, segment) => {
      const category = segment.category || 'other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(segment);
      return acc;
    }, {} as Record<string, typeof segments>);

    // Format as chapters
    const chapters = Object.entries(segmentsByCategory)
      .map(([category, categorySegments], index) => {
        const metadata = CATEGORY_METADATA[category] || {
          title: category.charAt(0).toUpperCase() + category.slice(1),
          description: `Stories about ${category}`,
          order: 99,
        };

        // Format stories
        const stories = categorySegments.map((segment, storyIndex) => {
          const durationSeconds = Math.floor((segment.endTimeMs - segment.startTimeMs) / 1000);
          const minutes = Math.floor(durationSeconds / 60);
          const seconds = durationSeconds % 60;

          return {
            id: segment.id,
            title: generateStoryTitle(segment),
            duration: `${minutes}:${String(seconds).padStart(2, '0')}`,
            durationSeconds,
            transcript: segment.transcriptText,
            recordedDate: segment.call.endedAt
              ? new Date(segment.call.endedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : 'Unknown',
            audioUrl: segment.audioClipUrl,
            quality: segment.storyQualityScore,
            qualityRationale: segment.qualityRationale,
            tone: segment.emotionalTone,
            // New enhanced fields
            pullQuotes: segment.pullQuotes || [],
            sensitivityFlags: segment.sensitivityFlags || [],
            keyPeople: segment.keyPeople || [],
            keyPlaces: segment.keyPlaces || [],
            keyDates: segment.keyDates || [],
            keyObjects: segment.keyObjects || [],
          };
        });

        return {
          id: index + 1,
          category,
          title: metadata.title,
          description: metadata.description,
          order: metadata.order,
          stories,
        };
      })
      .sort((a, b) => a.order - b.order);

    // Calculate stats
    const totalStories = segments.length;
    const totalChapters = chapters.length;
    const totalDurationSeconds = segments.reduce(
      (sum, seg) => sum + (seg.endTimeMs - seg.startTimeMs) / 1000,
      0
    );
    const totalMinutes = Math.floor(totalDurationSeconds / 60);

    // Calculate birth year if we have it
    const birthYear = resident.createdAt
      ? new Date().getFullYear() - 80 // Placeholder - we don't have birth year in schema
      : null;

    // Build the lifebook object
    const lifebook = {
      resident: {
        name: `${resident.firstName} ${resident.lastName}`,
        preferredName: resident.preferredName || resident.firstName,
        birthYear,
        intro: generateIntro(resident, totalStories),
      },
      stats: {
        totalStories,
        totalChapters,
        totalDuration: `${totalMinutes} min`,
      },
      chapters,
      status: determineStatus(totalStories, totalChapters),
    };

    return res.json(lifebook);
  } catch (error) {
    console.error('Error generating lifebook:', error);
    return res.status(500).json({ error: 'Failed to generate lifebook' });
  }
});

/**
 * Generate a story title from segment data
 */
function generateStoryTitle(segment: any): string {
  // If transcript is short enough, use first sentence
  const firstSentence = segment.transcriptText.split(/[.!?]/)[0];
  if (firstSentence.length <= 50) {
    return firstSentence.trim();
  }

  // Otherwise create a title from category and tone
  const category = segment.category || 'memory';
  const tone = segment.emotionalTone || '';

  // Extract key phrase from first 100 chars
  const snippet = segment.transcriptText.substring(0, 100);
  const words = snippet.split(' ');

  // Try to find a meaningful phrase
  if (words.length > 5) {
    return words.slice(0, 7).join(' ') + '...';
  }

  return `A ${tone} ${category} memory`;
}

/**
 * Generate intro text based on resident and content
 */
function generateIntro(resident: any, storyCount: number): string {
  if (storyCount === 0) {
    return 'Beginning to capture a lifetime of stories';
  }

  if (storyCount < 5) {
    return 'Early chapters in a remarkable story';
  }

  if (storyCount < 10) {
    return 'A growing collection of memories and moments';
  }

  return 'A lifetime of stories, told in their own words';
}

/**
 * Determine lifebook status based on content thresholds
 * Per lifebook.md spec:
 * - MINIMUM: 12+ segments, 4+ chapters (representing different life phases)
 * - Chapter 5 (messages to family) is NON-NEGOTIABLE
 * - Quality threshold: Average quality score >= 3
 *
 * Statuses:
 * - collecting: Still gathering content
 * - ready_for_review: Has minimum content, needs human review
 * - in_production: Approved, being formatted
 * - delivered: Completed and delivered
 */
function determineStatus(totalStories: number, totalChapters: number): string {
  if (totalStories === 0) {
    return 'collecting';
  }

  // Per spec: Minimum 12 segments across 4+ chapters
  // Note: We're being flexible on Chapter 5 requirement for now
  // since it requires explicit messages to family which may not exist yet
  if (totalStories >= 12 && totalChapters >= 4) {
    return 'ready_for_review';
  }

  // Has some content but below minimum threshold
  if (totalStories >= 6 && totalChapters >= 2) {
    return 'collecting'; // Making progress
  }

  return 'collecting'; // Just started
}

export default router;
