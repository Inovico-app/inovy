import type { StoragePutResult } from "@/server/services/storage";
import { getStorageProvider } from "@/server/services/storage";

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
 * Upload file buffer to blob storage
 * Returns blob information (url, pathname)
 */
export async function uploadToBlob(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<StoragePutResult> {
  const storage = await getStorageProvider();
  return storage.put(`recordings/${Date.now()}-${fileName}`, fileBuffer, {
    access: "public",
    contentType: mimeType,
    addRandomSuffix: true,
  });
}

