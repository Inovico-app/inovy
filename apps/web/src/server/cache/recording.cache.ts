import { CacheTags } from "@/lib/cache-utils";
import { cacheTag } from "next/cache";
import type { BetterAuthUser } from "@/lib/auth";
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
  recordingId: string,
): Promise<RecordingDto | null> {
  "use cache";
  cacheTag(CacheTags.recording(recordingId));
  const result = await RecordingService.getRecordingById(recordingId);
  return result.isOk() ? (result.value ?? null) : null;
}

/**
 * Get recordings by project ID (cached)
 * Calls RecordingService which includes business logic and auth checks
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
 * Team context must be passed as parameters so the cache is keyed per user/team.
 */
export async function getCachedRecordingsByOrganization(
  organizationId: string,
  teamContext?: {
    user?: BetterAuthUser;
    activeTeamId?: string | null;
    userTeamIds?: string[];
  },
  options?: {
    statusFilter?: "active" | "archived";
    search?: string;
    projectIds?: string[];
  },
) {
  "use cache";

  // Include activeTeamId in the cache tag so results are cached per team scope
  const teamSuffix = teamContext?.activeTeamId
    ? `:team:${teamContext.activeTeamId}`
    : ":all-teams";
  cacheTag(
    CacheTags.recordingsByOrg(organizationId),
    `recordings:org:${organizationId}${teamSuffix}`,
  );

  const recordings = await RecordingService.getRecordingsByOrganization(
    organizationId,
    { ...options, ...teamContext },
  );

  if (recordings.isOk()) {
    return recordings.value;
  }

  return [];
}
