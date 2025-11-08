"use cache";

import { CacheTags } from "@/lib/cache-utils";
import { cacheTag } from "next/cache";
import { RecordingService } from "../services/recording.service";

/**
 * Cached recording queries
 * Uses Next.js 16 cache with tags for invalidation
 */

/**
 * Get recording by ID (cached)
 * Calls RecordingService which includes business logic and auth checks
 */
export async function getCachedRecordingById(recordingId: string) {
  "use cache";
  cacheTag(CacheTags.recording(recordingId));
  return await RecordingService.getRecordingById(recordingId);
}

/**
 * Get recordings by project ID (cached)
 * Calls RecordingService which includes business logic and auth checks
 */
export async function getCachedRecordingsByProjectId(
  projectId: string,
  options?: { search?: string }
) {
  "use cache";
  cacheTag(CacheTags.recordingsByProject(projectId));
  return await RecordingService.getRecordingsByProjectId(projectId, options);
}

