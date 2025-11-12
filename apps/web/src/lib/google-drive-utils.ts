import type { PutBlobResult } from "@vercel/blob";
import { uploadRecordingToBlob } from "./vercel-blob";

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
 * Uses uploadRecordingToBlob function
 */
export async function uploadToBlob(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<PutBlobResult> {
  // Convert Buffer to File for uploadRecordingToBlob
  const uint8Array = new Uint8Array(fileBuffer);
  const blob = new Blob([uint8Array], { type: mimeType });
  const file = new File([blob], fileName, { type: mimeType });

  return uploadRecordingToBlob(file);
}

