import { CacheTags } from "@/lib/cache-utils";
import { cacheTag } from "next/cache";
import { TasksQueries } from "../data-access/tasks.queries";
import type { TaskFiltersDto, TaskStatsDto } from "../dto";

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

  const result = await TasksQueries.getTasksByOrganization(orgCode, {
    ...filters,
    assigneeId: userId,
  });

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  return result.value;
}

/**
 * Get task statistics (cached)
 */
export async function getCachedTaskStats(
  userId: string,
  orgCode: string
): Promise<TaskStatsDto> {
  "use cache";
  cacheTag(CacheTags.taskStats(userId, orgCode), CacheTags.tasksByOrg(orgCode));

  const result = await TasksQueries.getTasksByOrganization(orgCode, {
    assigneeId: userId,
  });

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  const tasks = result.value;

  // Calculate statistics
  const stats: TaskStatsDto = {
    total: tasks.length,
    byStatus: {
      pending: tasks.filter((t) => t.status === "pending").length,
      in_progress: tasks.filter((t) => t.status === "in_progress").length,
      completed: tasks.filter((t) => t.status === "completed").length,
      cancelled: tasks.filter((t) => t.status === "cancelled").length,
    },
    byPriority: {
      low: tasks.filter((t) => t.priority === "low").length,
      medium: tasks.filter((t) => t.priority === "medium").length,
      high: tasks.filter((t) => t.priority === "high").length,
      urgent: tasks.filter((t) => t.priority === "urgent").length,
    },
  };

  return stats;
}

