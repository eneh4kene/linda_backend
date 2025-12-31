import { prisma } from '../lib/prisma';

export interface BookReadinessResult {
  residentId: string;
  residentName: string;
  totalCalls: number;
  totalSegments: number;
  usableSegments: number; // Quality >= 3
  strongSegments: number; // Quality >= 4
  exceptionalSegments: number; // Quality >= 5
  chaptersCovered: number;
  hasChapter5: boolean;
  readinessStatus: 'collecting' | 'minimum_viable' | 'ready' | 'full_edition';
  bookTier: 'minimal' | 'thin' | 'standard' | 'full' | null;
  estimatedPages: number;
  chapterBreakdown: {
    chapter: string;
    segmentCount: number;
    avgQuality: number;
  }[];
  sensitivityFlags: string[];
  needsReview: boolean;
}

/**
 * Calculate book readiness for a resident
 * Per lifebook.md spec:
 * - Ready (Full): 12+ usable segments, 4+ chapters, has Chapter 5
 * - Minimum Viable: 6+ usable segments
 * - Collecting: Below thresholds
 */
export async function calculateBookReadiness(residentId: string): Promise<BookReadinessResult> {
  // Get resident
  const resident = await prisma.resident.findUnique({
    where: { id: residentId },
  });

  if (!resident) {
    throw new Error(`Resident not found: ${residentId}`);
  }

  // Get all completed calls
  const calls = await prisma.call.findMany({
    where: {
      residentId,
      status: 'completed',
    },
  });

  // Get all story segments with completed audio
  const segments = await prisma.storySegment.findMany({
    where: {
      residentId,
      audioClipStatus: 'completed',
      audioClipUrl: { not: null },
    },
  });

  // Calculate metrics
  const totalSegments = segments.length;
  const usableSegments = segments.filter((s) => (s.storyQualityScore ?? 0) >= 3).length;
  const strongSegments = segments.filter((s) => (s.storyQualityScore ?? 0) >= 4).length;
  const exceptionalSegments = segments.filter((s) => (s.storyQualityScore ?? 0) === 5).length;

  // Chapter coverage
  const categoriesSet = new Set(segments.map((s) => s.category).filter(Boolean));
  const chaptersCovered = categoriesSet.size;

  // Check for Chapter 5 content (messages to family)
  const hasChapter5 = segments.some((s) => {
    const flags = (s.sensitivityFlags as string[]) || [];
    return flags.includes('chapter_5_message');
  });

  // Collect all sensitivity flags
  const allSensitivityFlags = new Set<string>();
  segments.forEach((s) => {
    const flags = (s.sensitivityFlags as string[]) || [];
    flags.forEach((flag) => allSensitivityFlags.add(flag));
  });

  // Chapter breakdown
  const chapterBreakdown = Array.from(categoriesSet).map((category) => {
    const categorySegments = segments.filter((s) => s.category === category);
    const avgQuality =
      categorySegments.reduce((sum, s) => sum + (s.storyQualityScore ?? 0), 0) /
      categorySegments.length;

    return {
      chapter: category || 'unknown',
      segmentCount: categorySegments.length,
      avgQuality: Math.round(avgQuality * 10) / 10,
    };
  });

  // Determine readiness status
  let readinessStatus: BookReadinessResult['readinessStatus'] = 'collecting';
  let bookTier: BookReadinessResult['bookTier'] = null;
  let estimatedPages = 0;

  if (usableSegments >= 15 && chaptersCovered >= 5 && hasChapter5) {
    readinessStatus = 'full_edition';
    bookTier = 'full';
    estimatedPages = 50;
  } else if (usableSegments >= 12 && chaptersCovered >= 4 && hasChapter5) {
    readinessStatus = 'ready';
    bookTier = 'standard';
    estimatedPages = 40;
  } else if (usableSegments >= 6 && chaptersCovered >= 3 && hasChapter5) {
    readinessStatus = 'minimum_viable';
    bookTier = 'thin';
    estimatedPages = 24;
  } else if (usableSegments >= 3) {
    readinessStatus = 'collecting';
    if (usableSegments >= 4) {
      bookTier = 'minimal';
      estimatedPages = 16;
    }
  }

  // Needs review if has sensitivity flags (excluding chapter_5_message which is expected)
  const reviewFlags = Array.from(allSensitivityFlags).filter((f) => f !== 'chapter_5_message');
  const needsReview = reviewFlags.length > 0 || allSensitivityFlags.has('chapter_5_message');

  return {
    residentId,
    residentName: resident.preferredName || resident.firstName,
    totalCalls: calls.length,
    totalSegments,
    usableSegments,
    strongSegments,
    exceptionalSegments,
    chaptersCovered,
    hasChapter5,
    readinessStatus,
    bookTier,
    estimatedPages,
    chapterBreakdown,
    sensitivityFlags: Array.from(allSensitivityFlags),
    needsReview,
  };
}

/**
 * Get all residents with their readiness status
 */
export async function getAllResidentsReadiness(): Promise<BookReadinessResult[]> {
  const residents = await prisma.resident.findMany({
    where: { status: 'active' },
  });

  const results = await Promise.all(
    residents.map((r) => calculateBookReadiness(r.id).catch(() => null))
  );

  return results.filter((r): r is BookReadinessResult => r !== null);
}
