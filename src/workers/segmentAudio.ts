import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink } from 'fs/promises';
import { prisma } from '../lib/prisma';
import { downloadAudio, uploadAudioClip } from '../services/storage';

const execAsync = promisify(exec);

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

    // Check for recording URL - Retell stores it in call.audioUrl or we might have recordingUrl
    const recordingUrl = segment.call.audioUrl;

    if (!segment || !recordingUrl) {
      throw new Error('Segment or audio URL not found');
    }

    // Update status to processing
    await prisma.storySegment.update({
      where: { id: segmentId },
      data: { audioClipStatus: 'processing' },
    });

    // Download full audio
    console.log(`Downloading full audio from: ${recordingUrl}`);
    const audioBuffer = await downloadAudio(recordingUrl);

    // Save to temp file - use segmentId to avoid race conditions when multiple segments are processed in parallel
    const inputPath = `/tmp/${segmentId}-input.wav`;
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
