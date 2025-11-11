import { updateTag as nextUpdateTag } from "next/cache";

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

  // Project template tags
  projectTemplate: (projectId: string) => `project-template:${projectId}`,

  // Task tags
  tasksByUser: (userId: string, orgCode: string) =>
    `tasks:user:${userId}:org:${orgCode}`,
  tasksByOrg: (orgCode: string) => `tasks:org:${orgCode}`,
  taskStats: (userId: string, orgCode: string) =>
    `task-stats:user:${userId}:org:${orgCode}`,
  taskTags: (orgCode: string) => `task-tags:org:${orgCode}`,
  taskTagsForTask: (taskId: string) => `task-tags:task:${taskId}`,

  // Summary tags
  summary: (recordingId: string) => `summary:${recordingId}`,

  // User tags
  user: (kindeUserId: string) => `user:${kindeUserId}`,
  usersByOrg: (orgCode: string) => `users:org:${orgCode}`,

  // Organization tags
  organization: (orgCode: string) => `org:${orgCode}`,
  orgMembers: (orgCode: string) => `org-members:${orgCode}`,

  // Notification tags
  notifications: (userId: string, orgCode: string) =>
    `notifications:user:${userId}:org:${orgCode}`,
  notificationUnreadCount: (userId: string, orgCode: string) =>
    `notification-unread-count:user:${userId}:org:${orgCode}`,

  // Recording tags
  recording: (recordingId: string) => `recording:${recordingId}`,
  recordingsByProject: (projectId: string) => `recordings:project:${projectId}`,
  recordingsByOrg: (orgCode: string) => `recordings:org:${orgCode}`,

  // Dashboard tags
  dashboardStats: (orgCode: string) => `dashboard:stats:${orgCode}`,
  recentProjects: (orgCode: string) => `dashboard:recent-projects:${orgCode}`,
  recentRecordings: (orgCode: string) =>
    `dashboard:recent-recordings:${orgCode}`,

  // Auto-actions tags
  autoActions: (userId: string) => `auto-actions:user:${userId}`,
  autoActionStats: (userId: string) => `auto-action-stats:user:${userId}`,

  // History tags
  transcriptionHistory: (recordingId: string) =>
    `transcription-history:${recordingId}`,
  summaryHistory: (recordingId: string) => `summary-history:${recordingId}`,

  // Chat tags
  conversations: (userId: string, orgCode: string) =>
    `conversations:user:${userId}:org:${orgCode}`,
  conversationMessages: (conversationId: string) =>
    `conversation:${conversationId}:messages`,
} as const;

/**
 * Invalidate cache by tags
 * Wrapper around Next.js updateTag for consistency
 * updateTag immediately updates the cache
 * rather than waiting for the next revalidation
 */
export function invalidateCache(...tags: string[]): void {
  for (const tag of tags) {
    nextUpdateTag(tag);
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
      CacheTags.projectCount(orgCode),
      CacheTags.projectTemplate(projectId)
    );
  },

  /**
   * Invalidate project template cache
   */
  invalidateProjectTemplate(projectId: string): void {
    invalidateCache(CacheTags.projectTemplate(projectId));
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

  /**
   * Invalidate notification cache for a user
   */
  invalidateNotifications(userId: string, orgCode: string): void {
    invalidateCache(
      CacheTags.notifications(userId, orgCode),
      CacheTags.notificationUnreadCount(userId, orgCode)
    );
  },

  /**
   * Invalidate recording cache
   */
  invalidateRecording(
    recordingId: string,
    projectId: string,
    orgCode: string
  ): void {
    invalidateCache(
      CacheTags.recording(recordingId),
      CacheTags.recordingsByProject(projectId),
      CacheTags.recordingsByOrg(orgCode),
      CacheTags.dashboardStats(orgCode),
      CacheTags.recentRecordings(orgCode)
    );
  },

  /**
   * Invalidate recordings for a project
   */
  invalidateProjectRecordings(projectId: string, orgCode: string): void {
    invalidateCache(
      CacheTags.recordingsByProject(projectId),
      CacheTags.recordingsByOrg(orgCode),
      CacheTags.dashboardStats(orgCode),
      CacheTags.recentRecordings(orgCode)
    );
  },

  /**
   * Invalidate dashboard cache
   */
  invalidateDashboard(orgCode: string): void {
    invalidateCache(
      CacheTags.dashboardStats(orgCode),
      CacheTags.recentProjects(orgCode),
      CacheTags.recentRecordings(orgCode)
    );
  },

  /**
   * Invalidate auto-actions cache
   */
  invalidateAutoActions(userId: string): void {
    invalidateCache(
      CacheTags.autoActions(userId),
      CacheTags.autoActionStats(userId)
    );
  },

  /**
   * Invalidate task tags cache
   */
  invalidateTaskTags(taskId: string, orgCode: string): void {
    invalidateCache(
      CacheTags.taskTagsForTask(taskId),
      CacheTags.taskTags(orgCode)
    );
  },

  /**
   * Invalidate transcription history
   */
  invalidateTranscriptionHistory(recordingId: string): void {
    invalidateCache(
      CacheTags.transcriptionHistory(recordingId),
      CacheTags.recording(recordingId)
    );
  },

  /**
   * Invalidate summary history
   */
  invalidateSummaryHistory(recordingId: string): void {
    invalidateCache(
      CacheTags.summaryHistory(recordingId),
      CacheTags.summary(recordingId)
    );
  },

  /**
   * Invalidate conversation cache
   */
  invalidateConversations(
    userId: string,
    orgCode: string,
    conversationId?: string
  ): void {
    const tags = [CacheTags.conversations(userId, orgCode)];
    if (conversationId) {
      tags.push(CacheTags.conversationMessages(conversationId));
    }
    invalidateCache(...tags);
  },
} as const;

