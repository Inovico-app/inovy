import { CacheTags } from "@/lib/cache-utils";
import { cacheTag } from "next/cache";
import type { RecordingDto } from "../dto/recording.dto";
import { RecordingService } from "../services/recording.service";

/**
 * Cached recording queries
 * Uses Next.js 16 cache with tags for invalidation
 */

/**
 * Get recording by ID (cached)
 * Calls RecordingService which includes business logic and auth checks
 */
export async function getCachedRecordingById(
  recordingId: string
): Promise<RecordingDto | null> {
  "use cache";
  cacheTag(CacheTags.recording(recordingId));
  const result = await RecordingService.getRecordingById(recordingId);
  return result.isOk() ? (result.value ?? null) : null;
}

/**
 * Get recordings by project ID (cached)
 * Calls RecordingService which includes business logic and auth checks
 * Note: Search filtering should be done client-side to avoid cache fragmentation
 */
export async function getCachedRecordingsByProjectId(
  projectId: string,
  organizationId: string
) {
  "use cache";
  cacheTag(CacheTags.recordingsByProject(projectId));

  const recordings = await RecordingService.getRecordingsByProjectId(
    projectId,
    organizationId
  );

  if (recordings.isOk()) {
    return recordings.value;
  }

  return [];
}

/**
 * Get recordings by organization (cached)
 * Calls RecordingService which includes business logic and auth checks
 * Note: Filtering (search, status, projects) should be done client-side to avoid cache fragmentation
 */
export async function getCachedRecordingsByOrganization(
  organizationId: string
) {
  "use cache";
  cacheTag(CacheTags.recordingsByOrg(organizationId));

  const recordings = await RecordingService.getRecordingsByOrganization(
    organizationId
  );

  if (recordings.isOk()) {
    return recordings.value;
  }

  return [];
}

