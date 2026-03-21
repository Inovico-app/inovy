import type { BetterAuthUser } from "@/lib/auth";
import { CacheTags } from "@/lib/cache-utils";
import { cacheTag } from "next/cache";
import { TasksQueries } from "../data-access/tasks.queries";
import type { TaskDto, TaskFiltersDto, TaskStatsDto } from "../dto/task.dto";
import { TaskService } from "../services/task.service";

/**
 * Cached task queries
 * Uses Next.js 16 cache with tags for invalidation
 *
 * IMPORTANT: "use cache" functions must NOT call dynamic APIs (headers(),
 * cookies(), etc.). Auth checks must happen in the caller before invoking
 * these cached helpers.
 */

/**
 * Get tasks by user (cached)
 * Uses queries directly to avoid dynamic API calls inside cache scope.
 */
export async function getCachedTasksByUser(
  userId: string,
  orgCode: string,
  filters?: Omit<TaskFiltersDto, "assigneeId" | "organizationId">,
) {
  "use cache";
  cacheTag(
    CacheTags.tasksByUser(userId, orgCode),
    CacheTags.tasksByOrg(orgCode),
  );

  const tasks = await TasksQueries.getTasksByOrganization(orgCode, {
    ...filters,
    assigneeId: userId,
  });

  return tasks.map((task) => TaskService.toDto(task));
}

/**
 * Get task statistics (cached)
 */
export async function getCachedTaskStats(
  userId: string,
  orgCode: string,
): Promise<TaskStatsDto> {
  "use cache";
  cacheTag(
    CacheTags.tasksByUser(userId, orgCode),
    CacheTags.tasksByOrg(orgCode),
    CacheTags.taskStats(userId, orgCode),
  );

  return await TasksQueries.getTaskStats(orgCode, userId);
}

/**
 * Get tasks with context for a user (cached)
 * Returns tasks with project and recording information.
 * Auth context must be passed by the caller.
 */
export async function getCachedTasksWithContext(
  userId: string,
  orgCode: string,
  filters?: Omit<TaskFiltersDto, "assigneeId" | "organizationId">,
  teamContext?: { user: BetterAuthUser; userTeamIds: string[] },
) {
  "use cache";
  cacheTag(
    CacheTags.tasksByUser(userId, orgCode),
    CacheTags.tasksByOrg(orgCode),
  );

  const tasks = await TasksQueries.getTasksWithContext(orgCode, {
    ...filters,
    assigneeId: userId,
    user: teamContext?.user,
    userTeamIds: teamContext?.userTeamIds,
  });

  return tasks.map((task) => TaskService.toContextDto(task));
}

/**
 * Get all tasks with context for an organization (cached)
 * Returns all tasks visible to the user (team-scoped), not filtered by assignee.
 * Used for the shared tasks overview page.
 */
export async function getCachedAllTasksWithContext(
  orgCode: string,
  teamContext?: { user: BetterAuthUser; userTeamIds: string[] },
) {
  "use cache";
  cacheTag(CacheTags.tasksByOrg(orgCode));

  const tasks = await TasksQueries.getTasksWithContext(orgCode, {
    user: teamContext?.user,
    userTeamIds: teamContext?.userTeamIds,
  });

  return tasks.map((task) => TaskService.toContextDto(task));
}

/**
 * Get tasks for a recording (cached)
 * Uses queries directly to avoid dynamic API calls inside cache scope.
 * orgId is passed by the caller for proper cache tag scoping.
 */
export async function getCachedTasksByRecordingId(
  recordingId: string,
  orgId?: string | null,
): Promise<TaskDto[]> {
  "use cache";

  if (orgId) {
    cacheTag(
      CacheTags.tasksByRecording(recordingId),
      CacheTags.tasksByOrg(orgId),
    );
  } else {
    cacheTag(CacheTags.tasksByRecording(recordingId));
  }

  const tasks = await TasksQueries.getTasksByRecordingId(recordingId);
  return tasks.map((task) => TaskService.toDto(task));
}
