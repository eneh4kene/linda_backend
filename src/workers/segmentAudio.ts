import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink } from 'fs/promises';
import { claude } from '../lib/claude';
import { prisma } from '../lib/prisma';
import { downloadAudio, uploadAudioClip } from '../services/storage';
import { RetellTranscriptEntry, IdentifiedSegment } from '../types';

const execAsync = promisify(exec);

const SEGMENT_IDENTIFICATION_PROMPT = `Analyze this conversation transcript and identify segments where the resident shares meaningful stories, memories, or personal experiences worth preserving.

Look for:
- Complete stories with beginning, middle, end
- Emotional moments
- Family memories
- Career highlights
- Life events
- Vivid descriptions of the past

For each segment, provide:
- start_ms: timestamp where segment begins
- end_ms: timestamp where segment ends
- category: family_story, career_memory, life_event, childhood_memory, relationship_story, achievement, hardship, daily_life
- summary: brief description
- quality_score: 0-1 (how complete/meaningful is this story)
- emotional_intensity: 0-1
- speaker: "resident" or "agent"
- transcript_text: the actual text of the segment

Return JSON array. Only include segments scoring > 0.6 quality.

Transcript with timestamps:
{{transcript}}`;

/**
 * Identify story segments from transcript using Claude
 */
export async function identifyStorySegments(
  transcript: RetellTranscriptEntry[],
  _fullText: string
): Promise<IdentifiedSegment[]> {
  try {
    // Format transcript with timestamps
    const formattedTranscript = transcript
      .map((entry) => {
        const speaker = entry.role === 'agent' ? 'Linda' : 'Resident';
        return `[${entry.start_ms}ms - ${entry.end_ms}ms] ${speaker}: ${entry.content}`;
      })
      .join('\n');

    const prompt = SEGMENT_IDENTIFICATION_PROMPT.replace('{{transcript}}', formattedTranscript);

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

    // Extract JSON from response
    let jsonText = text;
    if (text.startsWith('```')) {
      const match = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
      if (match) {
        jsonText = match[1];
      }
    }

    const segments: IdentifiedSegment[] = JSON.parse(jsonText);

    if (!Array.isArray(segments)) {
      console.warn('Claude response was not an array, returning empty segments');
      return [];
    }

    // Filter by quality threshold
    return segments.filter(
      (s) =>
        s.quality_score > 0.6 &&
        s.start_ms !== undefined &&
        s.end_ms !== undefined &&
        s.category &&
        s.transcript_text
    );
  } catch (error) {
    console.error('Error identifying story segments:', error);
    return [];
  }
}

/**
 * Extract audio clip using FFmpeg
 */
export async function extractAudioClip(segmentId: string): Promise<void> {
  try {
    const segment = await prisma.storySegment.findUnique({
      where: { id: segmentId },
      include: {
        call: true,
      },
    });

    if (!segment || !segment.call.audioUrl) {
      throw new Error('Segment or audio URL not found');
    }

    // Update status to processing
    await prisma.storySegment.update({
      where: { id: segmentId },
      data: { audioClipStatus: 'processing' },
    });

    // Download full audio
    console.log(`Downloading full audio from: ${segment.call.audioUrl}`);
    const audioBuffer = await downloadAudio(segment.call.audioUrl);

    // Save to temp file
    const inputPath = `/tmp/${segment.callId}-input.wav`;
    const outputPath = `/tmp/${segmentId}-output.mp3`;

    await writeFile(inputPath, audioBuffer);

    // Convert milliseconds to seconds
    const startSeconds = segment.startTimeMs / 1000;
    const endSeconds = segment.endTimeMs / 1000;

    // Run FFmpeg to extract clip
    const command = `ffmpeg -i "${inputPath}" -ss ${startSeconds} -to ${endSeconds} -c:a libmp3lame -q:a 2 "${outputPath}"`;
    console.log(`Running FFmpeg: ${command}`);

    await execAsync(command);

    // Read the output file
    const fs = require('fs');
    const clipBuffer = await fs.promises.readFile(outputPath);

    // Upload to Vercel Blob
    console.log(`Uploading audio clip for segment ${segmentId}`);
    const clipUrl = await uploadAudioClip(segmentId, segment.residentId, clipBuffer);

    // Update segment with clip URL
    await prisma.storySegment.update({
      where: { id: segmentId },
      data: {
        audioClipUrl: clipUrl,
        audioClipStatus: 'completed',
      },
    });

    console.log(`Successfully extracted audio clip for segment ${segmentId}`);

    // Clean up temp files
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
  } catch (error) {
    console.error(`Error extracting audio clip for segment ${segmentId}:`, error);

    // Update status to failed
    await prisma.storySegment.update({
      where: { id: segmentId },
      data: { audioClipStatus: 'failed' },
    });

    throw error;
  }
}
