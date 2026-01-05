import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';

const claude = new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY,
});

export interface FamilyCheckInSummary {
  moodSummary: string;
  topicsDiscussed: string[];
  concernsRaised: Array<{
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  starredMoments: Array<{
    segmentId: string;
    title: string;
    snippet: string;
  }>;
  generatedScript: string;
  periodStartDate: Date;
  periodEndDate: Date;
  generationModel: string;
  generationTokens: number;
}

/**
 * Generate a warm, privacy-respecting summary for a family member check-in
 */
export async function generateFamilyCheckInSummary(
  residentId: string,
  familyMemberId: string,
  daysBack: number = 7
): Promise<FamilyCheckInSummary> {
  // Get resident and family member info
  const [resident, familyMember] = await Promise.all([
    prisma.resident.findUnique({
      where: { id: residentId },
      select: {
        firstName: true,
        lastName: true,
        preferredName: true,
        familyCheckInConsent: true,
      },
    }),
    prisma.familyMember.findUnique({
      where: { id: familyMemberId },
      select: {
        firstName: true,
        lastName: true,
        relationship: true,
        canAccessStarred: true,
      },
    }),
  ]);

  if (!resident) {
    throw new Error('Resident not found');
  }

  if (!familyMember) {
    throw new Error('Family member not found');
  }

  if (!resident.familyCheckInConsent) {
    throw new Error('Resident has not provided consent for family check-ins');
  }

  // Calculate date range
  const periodEndDate = new Date();
  const periodStartDate = new Date();
  periodStartDate.setDate(periodStartDate.getDate() - daysBack);

  // Get recent calls and story segments
  const calls = await prisma.call.findMany({
    where: {
      residentId,
      status: 'completed',
      endedAt: {
        gte: periodStartDate,
        lte: periodEndDate,
      },
    },
    include: {
      segments: {
        where: {
          isExcluded: false,
        },
        select: {
          id: true,
          category: true,
          subcategory: true,
          emotionalTone: true,
          emotionalIntensity: true,
          isStarred: true,
          transcriptText: true,
          storyQualityScore: true,
          sensitivityFlags: true,
        },
        orderBy: {
          startTimeMs: 'asc',
        },
      },
    },
    orderBy: {
      endedAt: 'desc',
    },
  });

  if (calls.length === 0) {
    // No recent calls - generate a "no recent activity" script
    const noActivityScript = generateNoRecentActivityScript(
      resident.preferredName || resident.firstName,
      familyMember.firstName,
      familyMember.relationship,
      daysBack
    );

    return {
      moodSummary: 'No recent conversations',
      topicsDiscussed: [],
      concernsRaised: [],
      starredMoments: [],
      generatedScript: noActivityScript,
      periodStartDate,
      periodEndDate,
      generationModel: 'none',
      generationTokens: 0,
    };
  }

  // Collect all segments
  const allSegments = calls.flatMap((call) => call.segments);

  // Filter starred moments if family member has access
  const starredSegments = familyMember.canAccessStarred
    ? allSegments.filter((seg) => seg.isStarred)
    : [];

  // Build context for Claude
  const segmentsSummary = allSegments
    .map((seg, idx) => {
      return `Segment ${idx + 1}:
- Category: ${seg.category || 'General'}${seg.subcategory ? ` (${seg.subcategory})` : ''}
- Emotional tone: ${seg.emotionalTone || 'neutral'}
- Quality score: ${seg.storyQualityScore || 'N/A'}/5
- Sensitivity flags: ${seg.sensitivityFlags ? JSON.stringify(seg.sensitivityFlags) : 'none'}
- Is starred: ${seg.isStarred ? 'YES' : 'no'}`;
    })
    .join('\n\n');

  const starredSnippets = starredSegments
    .map((seg, idx) => {
      return `Starred Moment ${idx + 1}:
- Category: ${seg.category}
- Brief snippet: ${seg.transcriptText.slice(0, 150)}...`;
    })
    .join('\n\n');

  const residentName = resident.preferredName || resident.firstName;

  const prompt = `You are Linda, an AI companion for senior living facilities. You're making a warm, caring phone call to ${familyMember.firstName} ${familyMember.lastName}, who is ${residentName}'s ${familyMember.relationship}.

PRIVACY RULES (CRITICAL):
1. NEVER share exact quotes or transcripts from conversations
2. NEVER share specific details about what ${residentName} said
3. ONLY share general mood, energy level, and topic categories
4. Be warm and reassuring, not clinical
5. If there are concerning patterns (withdrawal, sadness, confusion), flag them for staff review but still be gentle with family

CONTEXT:
- You've had ${calls.length} conversation${calls.length > 1 ? 's' : ''} with ${residentName} in the past ${daysBack} days
- ${allSegments.length} story segments were identified
- ${starredSegments.length} moments were starred as particularly meaningful

SEGMENT ANALYSIS:
${segmentsSummary}

${starredSegments.length > 0 ? `STARRED MOMENTS (can be mentioned in general terms):\n${starredSnippets}` : ''}

YOUR TASK:
Generate a JSON response with the following structure:

{
  "moodSummary": "A 5-10 word description of ${residentName}'s overall mood (e.g., 'upbeat and engaged', 'reflective but content', 'a bit quieter than usual')",
  "topicsDiscussed": ["array", "of", "general", "topics", "discussed"], // e.g., "family memories", "their childhood home", "recent facility activities"
  "concernsRaised": [
    // ONLY include if there are genuine concerns (withdrawal, repeated sadness, confusion)
    {
      "type": "emotional" | "cognitive" | "social" | "health",
      "description": "Brief description for staff",
      "severity": "low" | "medium" | "high"
    }
  ],
  "generatedScript": "A warm, 2-3 paragraph script for Linda to read to ${familyMember.firstName}. Should sound natural and caring, like talking to a friend. Start with 'Hi ${familyMember.firstName}, it's Linda calling with an update about ${residentName}.' Include the mood summary, 2-3 topic categories they've been enjoying, and end with an invitation to call anytime."
}

SCRIPT TONE GUIDELINES:
- Warm and conversational, not robotic
- Specific enough to feel personal, vague enough to protect privacy
- Example: "She's been in great spirits this week, really enjoying reminiscing about her time as a teacher" NOT "She told me about the time she taught 3rd grade in 1967"
- If starred moments exist, mention them in general terms: "She shared some beautiful memories about her late husband that I know would mean a lot to you"

Generate the JSON response now:`;

  try {
    const response = await claude.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Parse Claude's response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not extract JSON from Claude response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Build starred moments array
    const starredMoments = starredSegments.map((seg) => ({
      segmentId: seg.id,
      title: seg.category || 'Untitled moment',
      snippet: seg.transcriptText.slice(0, 150) + '...',
    }));

    return {
      moodSummary: parsed.moodSummary,
      topicsDiscussed: parsed.topicsDiscussed,
      concernsRaised: parsed.concernsRaised || [],
      starredMoments,
      generatedScript: parsed.generatedScript,
      periodStartDate,
      periodEndDate,
      generationModel: 'claude-3-5-haiku-20241022',
      generationTokens: response.usage.input_tokens + response.usage.output_tokens,
    };
  } catch (error) {
    console.error('Error generating family check-in summary:', error);
    throw new Error('Failed to generate check-in summary');
  }
}

/**
 * Generate a script when there are no recent calls
 */
function generateNoRecentActivityScript(
  residentName: string,
  familyMemberName: string,
  relationship: string,
  daysBack: number
): string {
  return `Hi ${familyMemberName}, it's Linda calling with an update about ${residentName}.

I wanted to reach out, but I should let you know that ${residentName} and I haven't had any conversations in the past ${daysBack} days. This might just mean they've been busy with activities or visitors, or it could be worth checking in with the care team to see how they're doing.

If you'd like more information about ${residentName}'s recent activities or wellbeing, I'd encourage you to give the facility a call. And of course, ${residentName} would probably love to hear from you directly!

Take care, and feel free to call back anytime for updates.`;
}
