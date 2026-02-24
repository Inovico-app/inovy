import type { BetterAuthUser } from "@/lib/auth";
import { CacheTags } from "@/lib/cache-utils";
import { cacheTag } from "next/cache";
import type { RecordingDto } from "../dto/recording.dto";
import { RecordingService } from "../services/recording.service";

/**
 * Cached recording queries with data minimization
 * Uses Next.js 16 cache with tags for invalidation
 * 
 * Note: Cache varies by user role to ensure proper data minimization
 */

/**
 * Get recording by ID (cached) with role-based data minimization
 * @param recordingId - Recording ID
 * @param user - Optional user for role-based filtering
 * @param auditContext - Optional audit context
 */
export async function getCachedRecordingById(
  recordingId: string,
  user?: BetterAuthUser,
  auditContext?: { ipAddress?: string; userAgent?: string }
): Promise<RecordingDto | null> {
  "use cache";
  cacheTag(CacheTags.recording(recordingId));
  
  // Cache key varies by user role to ensure proper data minimization
  cacheTag(`recording:${recordingId}:role:${user?.role ?? "anonymous"}`);
  
  const result = await RecordingService.getRecordingById(
    recordingId,
    user,
    auditContext
  );
  return result.isOk() ? (result.value ?? null) : null;
}

/**
 * Get recordings by project ID (cached) with role-based data minimization
 * @param projectId - Project ID
 * @param organizationId - Organization ID
 * @param options - Query options
 * @param user - Optional user for role-based filtering
 */
export async function getCachedRecordingsByProjectId(
  projectId: string,
  organizationId: string,
  options?: { search?: string },
  user?: BetterAuthUser
) {
  "use cache";
  cacheTag(CacheTags.recordingsByProject(projectId));
  
  // Cache key varies by user role
  cacheTag(`recordings:project:${projectId}:role:${user?.role ?? "anonymous"}`);

  const recordings = await RecordingService.getRecordingsByProjectId(
    projectId,
    organizationId,
    options,
    user
  );

  if (recordings.isOk()) {
    return recordings.value;
  }

  return [];
}

/**
 * Get recordings by organization (cached) with role-based data minimization
 * @param organizationId - Organization ID
 * @param options - Query options
 * @param user - Optional user for role-based filtering
 */
export async function getCachedRecordingsByOrganization(
  organizationId: string,
  options?: {
    statusFilter?: "active" | "archived";
    search?: string;
    projectIds?: string[];
  },
  user?: BetterAuthUser
) {
  "use cache";
  cacheTag(CacheTags.recordingsByOrg(organizationId));
  
  // Cache key varies by user role
  cacheTag(`recordings:org:${organizationId}:role:${user?.role ?? "anonymous"}`);

  const recordings = await RecordingService.getRecordingsByOrganization(
    organizationId,
    options,
    user
  );

  if (recordings.isOk()) {
    return recordings.value;
  }

  return [];
}

