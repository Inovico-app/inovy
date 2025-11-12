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
  organizationId: string,
  options?: { search?: string }
) {
  "use cache";
  cacheTag(CacheTags.recordingsByProject(projectId));

  const recordings = await RecordingService.getRecordingsByProjectId(
    projectId,
    organizationId,
    options
  );

  if (recordings.isOk()) {
    return recordings.value;
  }

  return [];
}

/**
 * Get recordings by organization (cached)
 * Calls RecordingService which includes business logic and auth checks
 */
export async function getCachedRecordingsByOrganization(
  organizationId: string,
  options?: {
    statusFilter?: "active" | "archived";
    search?: string;
    projectIds?: string[];
  }
) {
  "use cache";
  cacheTag(CacheTags.recordingsByOrg(organizationId));

  const recordings = await RecordingService.getRecordingsByOrganization(
    organizationId,
    options
  );

  if (recordings.isOk()) {
    return recordings.value;
  }

  return [];
}

