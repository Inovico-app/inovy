import { CacheTags } from "@/lib/cache-utils";
import { cacheTag } from "next/cache";
import type { TaskTag } from "../db/schema/task-tags";
import { TaskService } from "../services/task.service";

/**
 * Cached task tags queries
 * Uses Next.js 16 cache with tags for invalidation
 */

/**
 * Get task tags for a specific task (cached)
 * Calls TaskService which includes business logic and auth checks
 */
export async function getCachedTaskTags(taskId: string): Promise<TaskTag[]> {
  "use cache";
  cacheTag(CacheTags.taskTagsForTask(taskId));
  const result = await TaskService.getTaskTags(taskId);
  return result.isOk() ? result.value : [];
}

/**
 * Get all tags for an organization (cached)
 * Calls TaskService which includes business logic and auth checks
 */
export async function getCachedTagsByOrganization(
  organizationId: string
): Promise<TaskTag[]> {
  "use cache";
  cacheTag(CacheTags.taskTags(organizationId));
  const result = await TaskService.getTagsByOrganization(organizationId);
  return result.isOk() ? result.value : [];
}

