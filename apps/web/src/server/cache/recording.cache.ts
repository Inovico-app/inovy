import type { BetterAuthUser } from "@/lib/auth";
import { CacheTags } from "@/lib/cache-utils";
import { cacheTag } from "next/cache";
import { RecordingsQueries } from "../data-access/recordings.queries";
import type { RecordingDto } from "../dto/recording.dto";
import { RecordingService } from "../services/recording.service";

/**
 * Cached recording queries
 * Uses Next.js 16 cache with tags for invalidation
 *
 * IMPORTANT: "use cache" functions must NOT call dynamic APIs (headers(),
 * cookies(), etc.). Auth and team-access checks must happen in the caller
 * (page / server action) before invoking these cached helpers.
 */

/**
 * Get recording by ID (cached)
 * Uses queries directly to avoid dynamic API calls inside cache scope.
 * Callers must verify auth and team access before using the result.
 */
export async function getCachedRecordingById(
  recordingId: string,
): Promise<RecordingDto | null> {
  "use cache";
  cacheTag(CacheTags.recording(recordingId));

  const recording = await RecordingsQueries.selectRecordingById(recordingId);
  if (!recording) return null;

  return RecordingService.toDto(recording);
}

/**
 * Get recordings by project ID (cached)
 */
export async function getCachedRecordingsByProjectId(
  projectId: string,
  organizationId: string,
  options?: { search?: string },
) {
  "use cache";
  cacheTag(CacheTags.recordingsByProject(projectId));

  const recordings = await RecordingService.getRecordingsByProjectId(
    projectId,
    organizationId,
    options,
  );

  if (recordings.isOk()) {
    return recordings.value;
  }

  return [];
}

/**
 * Get recordings by organization (cached)
 * Team context must be resolved by the caller and passed in.
 */
export async function getCachedRecordingsByOrganization(
  organizationId: string,
  options?: {
    statusFilter?: "active" | "archived";
    search?: string;
    projectIds?: string[];
    user?: BetterAuthUser;
    userTeamIds?: string[];
  },
) {
  "use cache";
  cacheTag(CacheTags.recordingsByOrg(organizationId));

  const recordings = await RecordingService.getRecordingsByOrganization(
    organizationId,
    options,
  );

  if (recordings.isOk()) {
    return recordings.value;
  }

  return [];
}
