import { CacheTags } from "@/lib/cache-utils";
import { cacheTag } from "next/cache";
import { TasksQueries } from "../data-access/tasks.queries";
import type { TaskFiltersDto, TaskStatsDto } from "../dto";
import { TaskService } from "../services";

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

  return await TaskService.getTasksByAssignee({
    ...filters,
  });
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
    CacheTags.tasksByOrg(orgCode)
  );

  return await TasksQueries.getTaskStats(orgCode, userId);
}

