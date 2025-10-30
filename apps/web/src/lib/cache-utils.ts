import { revalidateTag as nextRevalidateTag } from "next/cache";

/**
 * Cache tag utilities for Next.js 16 cache system
 * Replaces Redis key patterns with tag-based invalidation
 */

/**
 * Generate cache tags for different entity types
 */
export const CacheTags = {
  // Project tags
  project: (projectId: string) => `project:${projectId}`,
  projectsByOrg: (orgCode: string) => `projects:org:${orgCode}`,
  projectCount: (orgCode: string) => `project-count:org:${orgCode}`,

  // Task tags
  tasksByUser: (userId: string, orgCode: string) =>
    `tasks:user:${userId}:org:${orgCode}`,
  tasksByOrg: (orgCode: string) => `tasks:org:${orgCode}`,
  taskStats: (userId: string, orgCode: string) =>
    `task-stats:user:${userId}:org:${orgCode}`,

  // Summary tags
  summary: (recordingId: string) => `summary:${recordingId}`,

  // User tags
  user: (kindeUserId: string) => `user:${kindeUserId}`,
  usersByOrg: (orgCode: string) => `users:org:${orgCode}`,

  // Organization tags
  organization: (orgCode: string) => `org:${orgCode}`,
} as const;

/**
 * Invalidate cache by tags
 * Wrapper around Next.js revalidateTag for consistency
 * Uses 'max' mode for immediate revalidation
 */
export function invalidateCache(...tags: string[]): void {
  for (const tag of tags) {
    nextRevalidateTag(tag, "max");
  }
}

/**
 * Invalidation helpers for different entity types
 * Replaces CacheService.INVALIDATION methods
 */
export const CacheInvalidation = {
  /**
   * Invalidate all project-related cache for an organization
   */
  invalidateProjectCache(orgCode: string): void {
    invalidateCache(
      CacheTags.projectsByOrg(orgCode),
      CacheTags.projectCount(orgCode)
    );
  },

  /**
   * Invalidate specific project cache
   */
  invalidateProject(projectId: string, orgCode: string): void {
    invalidateCache(
      CacheTags.project(projectId),
      CacheTags.projectsByOrg(orgCode),
      CacheTags.projectCount(orgCode)
    );
  },

  /**
   * Invalidate user-related cache
   */
  invalidateUser(kindeUserId: string, orgCode: string): void {
    invalidateCache(CacheTags.user(kindeUserId), CacheTags.usersByOrg(orgCode));
  },

  /**
   * Invalidate organization-related cache
   */
  invalidateOrganization(orgCode: string): void {
    invalidateCache(CacheTags.organization(orgCode));
  },

  /**
   * Invalidate all task-related cache for a user
   */
  invalidateTaskCache(userId: string, orgCode: string): void {
    invalidateCache(
      CacheTags.tasksByUser(userId, orgCode),
      CacheTags.taskStats(userId, orgCode),
      CacheTags.tasksByOrg(orgCode)
    );
  },

  /**
   * Invalidate summary cache
   */
  invalidateSummary(recordingId: string): void {
    invalidateCache(CacheTags.summary(recordingId));
  },
} as const;

