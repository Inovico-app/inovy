import { put } from "@vercel/blob";
import type { PutBlobResult } from "@vercel/blob";

/**
 * Google Drive File Processing Utilities
 * Utility functions for processing Drive files
 */

/**
 * Check if MIME type is audio or video
 */
export function isAudioOrVideoFile(mimeType: string): boolean {
  return mimeType.startsWith("audio/") || mimeType.startsWith("video/");
}

/**
 * Upload file buffer to Vercel Blob storage
 * Returns blob information (url, pathname, etc.)
 */
export async function uploadToBlob(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<PutBlobResult> {
  // Create a Blob from the buffer
  const blob = new Blob([fileBuffer], { type: mimeType });

  // Create a File from the Blob (needed for Vercel Blob API)
  const file = new File([blob], fileName, { type: mimeType });

  // Upload to Vercel Blob
  const result = await put(`recordings/${Date.now()}-${fileName}`, file, {
    access: "public",
  });

  return result;
}

