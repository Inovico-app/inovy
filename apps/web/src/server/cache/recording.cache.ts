import { getBetterAuthSession } from "@/lib/better-auth-session";
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
 * Calls RecordingService which includes business logic and auth checks
 */
export async function getCachedRecordingsByOrganization(
  organizationId: string,
  options?: {
    statusFilter?: "active" | "archived";
    search?: string;
    projectIds?: string[];
  },
) {
  "use cache";
  cacheTag(CacheTags.recordingsByOrg(organizationId));

  // Resolve team context from session so the query filters by the user's teams
  const authResult = await getBetterAuthSession();
  const teamContext =
    authResult.isOk() && authResult.value.isAuthenticated
      ? {
          user: authResult.value.user ?? undefined,
          userTeamIds: authResult.value.userTeamIds,
        }
      : {};

  const recordings = await RecordingService.getRecordingsByOrganization(
    organizationId,
    { ...options, ...teamContext },
  );

  if (recordings.isOk()) {
    return recordings.value;
  }

  return [];
}
