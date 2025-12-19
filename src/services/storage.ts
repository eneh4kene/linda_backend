import { put } from '@vercel/blob';
import { env } from '../config/env';

/**
 * Upload full call recording to Vercel Blob
 */
export async function uploadAudio(callId: string, audioBuffer: Buffer): Promise<string> {
  const { url } = await put(`calls/${callId}/recording.wav`, audioBuffer, {
    access: 'public',
    contentType: 'audio/wav',
    token: env.BLOB_READ_WRITE_TOKEN,
  });
  return url;
}

/**
 * Upload story segment audio clip to Vercel Blob
 */
export async function uploadAudioClip(
  segmentId: string,
  residentId: string,
  clipBuffer: Buffer
): Promise<string> {
  const { url } = await put(`clips/${residentId}/${segmentId}.mp3`, clipBuffer, {
    access: 'public',
    contentType: 'audio/mpeg',
    token: env.BLOB_READ_WRITE_TOKEN,
  });
  return url;
}

/**
 * Download audio file from a URL
 */
export async function downloadAudio(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download audio: ${response.status} ${response.statusText}`);
  }
  return Buffer.from(await response.arrayBuffer());
}
