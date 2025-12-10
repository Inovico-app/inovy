import { CacheTags } from "@/lib/cache-utils";
import { cacheTag } from "next/cache";
import { TaskService } from "../services/task.service";

/**
 * Cached task tags queries
 * Uses Next.js 16 cache with tags for invalidation
 */

/**
 * Get task tags for a specific task (cached)
 * Calls TaskService which includes business logic and auth checks
 */
export async function getCachedTaskTags(taskId: string) {
  "use cache";
  cacheTag(CacheTags.taskTagsForTask(taskId));
  return await TaskService.getTaskTags(taskId);
}

/**
 * Get all tags for an organization (cached)
 * Calls TaskService which includes business logic and auth checks
 */
export async function getCachedTagsByOrganization(organizationId: string) {
  "use cache";
  cacheTag(CacheTags.taskTags(organizationId));
  return await TaskService.getTagsByOrganization(organizationId);
}

