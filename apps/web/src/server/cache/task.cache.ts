import { getBetterAuthSession } from "@/lib/better-auth-session";
import { CacheTags } from "@/lib/cache-utils";
import { cacheTag } from "next/cache";
import { TasksQueries } from "../data-access/tasks.queries";
import type { TaskFiltersDto, TaskStatsDto } from "../dto/task.dto";
import { TaskService } from "../services/task.service";

/**
 * Cached task queries
 * Uses Next.js 16 cache with tags for invalidation
 */

/**
 * Get tasks by user (cached)
 */
export async function getCachedTasksByUser(
  userId: string,
  orgCode: string,
  filters?: Omit<TaskFiltersDto, "assigneeId" | "organizationId">
) {
  "use cache";
  cacheTag(
    CacheTags.tasksByUser(userId, orgCode),
    CacheTags.tasksByOrg(orgCode)
  );

  const result = await TaskService.getTasksByAssignee(filters);
  return result.isOk() ? (result.value ?? []) : [];
}

/**
 * Get task statistics (cached)
 */
export async function getCachedTaskStats(
  userId: string,
  orgCode: string
): Promise<TaskStatsDto> {
  "use cache";
  cacheTag(
    CacheTags.tasksByUser(userId, orgCode),
    CacheTags.tasksByOrg(orgCode),
    CacheTags.taskStats(userId, orgCode)
  );

  return await TasksQueries.getTaskStats(orgCode, userId);
}

/**
 * Get tasks with context for the authenticated user (cached)
 * Returns tasks with project and recording information
 */
export async function getCachedTasksWithContext(
  userId: string,
  orgCode: string,
  filters?: Omit<TaskFiltersDto, "assigneeId" | "organizationId">
) {
  "use cache";
  cacheTag(
    CacheTags.tasksByUser(userId, orgCode),
    CacheTags.tasksByOrg(orgCode)
  );

  const result = await TaskService.getTasksWithContext(filters);
  if (result.isErr()) {
    return [];
  }

  return result.value ?? [];
}

/**
 * Get tasks for a recording (cached)
 * Tags include recording-specific and organization-wide task tags so existing
 * task mutation invalidation stays effective.
 */
export async function getCachedTasksByRecordingId(recordingId: string) {
  "use cache";

  const authResult = await getBetterAuthSession();
  const orgId =
    authResult.isOk() && authResult.value.organization
      ? authResult.value.organization.id
      : null;

  if (orgId) {
    cacheTag(
      CacheTags.tasksByRecording(recordingId),
      CacheTags.tasksByOrg(orgId)
    );
  } else {
    cacheTag(CacheTags.tasksByRecording(recordingId));
  }

  const result = await TaskService.getTasksByRecordingId(recordingId);

  return result.isOk() ? result.value : [];
}

