import { updateTag as nextUpdateTag, revalidateTag } from "next/cache";

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
  user: (userId: string) => `user:${userId}`,
  usersByOrg: (orgCode: string) => `users:org:${orgCode}`,

  // Organization tags
  organization: (orgCode: string) => `org:${orgCode}`,
  orgMembers: (orgCode: string) => `org-members:${orgCode}`,
  organizationInstructions: (orgCode: string) => `org-instructions:${orgCode}`,
  organizationSettings: (orgCode: string) => `org-settings:${orgCode}`,

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

  // Drive Watch tags
  driveWatches: (userId: string) => `drive-watches:user:${userId}`,

  // Knowledge Base tags
  knowledgeEntries: (
    scope: "project" | "org" | "global",
    scopeId?: string
  ): string => {
    if (scope === "global") {
      return `knowledge-entries:global`;
    }
    if (!scopeId) {
      throw new Error(
        `scopeId is required for ${scope} scope in knowledgeEntries`
      );
    }
    return scope === "org"
      ? `knowledge-entries:org:${scopeId}`
      : `knowledge-entries:project:${scopeId}`;
  },
  knowledgeDocuments: (
    scope: "project" | "org" | "global",
    scopeId?: string
  ): string => {
    if (scope === "global") {
      return `knowledge-documents:global`;
    }
    if (!scopeId) {
      throw new Error(
        `scopeId is required for ${scope} scope in knowledgeDocuments`
      );
    }
    return scope === "org"
      ? `knowledge-documents:org:${scopeId}`
      : `knowledge-documents:project:${scopeId}`;
  },
  knowledgeHierarchy: (projectId?: string, orgId?: string) =>
    projectId && orgId
      ? `knowledge-hierarchy:project:${projectId}:org:${orgId}`
      : undefined,

  // Team tags
  team: (teamId: string) => `team:${teamId}`,
  teamsByOrg: (orgCode: string) => `teams:org:${orgCode}`,
  teamMembers: (teamId: string) => `team-members:${teamId}`,
  teamsByDepartment: (departmentId: string) => `teams:department:${departmentId}`,
  userTeams: (userId: string, orgCode: string) =>
    `user-teams:user:${userId}:org:${orgCode}`,

  // Organization list tags (for superadmin)
  organizations: () => `organizations:all`,
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
  invalidateUser(userId: string, orgCode: string): void {
    invalidateCache(CacheTags.user(userId), CacheTags.usersByOrg(orgCode));
  },

  /**
   * Invalidate organization-related cache
   */
  invalidateOrganization(orgCode: string): void {
    invalidateCache(CacheTags.organization(orgCode));
  },

  /**
   * Invalidate organization instructions cache
   */
  invalidateOrganizationInstructions(orgCode: string): void {
    invalidateCache(CacheTags.organizationInstructions(orgCode));
  },

  /**
   * Invalidate organization settings cache
   */
  invalidateOrganizationSettings(orgCode: string): void {
    invalidateCache(CacheTags.organizationSettings(orgCode));
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
    revalidateTag(CacheTags.summary(recordingId), "max");
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

  /**
   * Invalidate knowledge base cache for a specific scope
   * For non-global scopes, scopeId is required and must be a non-null string
   */
  invalidateKnowledge(
    scope: "project" | "organization" | "global",
    scopeId?: string | null
  ): void {
    // Early return for global scope - no scopeId needed
    if (scope === "global") {
      invalidateCache(
        CacheTags.knowledgeEntries("global"),
        CacheTags.knowledgeDocuments("global")
      );
      return;
    }

    // For non-global scopes, scopeId is required
    if (!scopeId) {
      throw new Error(
        `scopeId is required for ${scope} scope in invalidateKnowledge`
      );
    }

    // At this point, scopeId is guaranteed to be a non-null string
    const tags: string[] = [];
    if (scope === "organization") {
      tags.push(
        CacheTags.knowledgeEntries("org", scopeId),
        CacheTags.knowledgeDocuments("org", scopeId)
      );
    } else {
      // scope === "project"
      tags.push(
        CacheTags.knowledgeEntries("project", scopeId),
        CacheTags.knowledgeDocuments("project", scopeId)
      );
    }
    invalidateCache(...tags);
  },

  /**
   * Invalidate hierarchical knowledge cache
   * Invalidates project, organization, and global caches, plus all hierarchies
   */
  invalidateKnowledgeHierarchy(
    projectId: string | null,
    orgId: string | null
  ): void {
    const tags: string[] = [];

    if (projectId) {
      tags.push(CacheTags.knowledgeEntries("project", projectId));
      tags.push(CacheTags.knowledgeDocuments("project", projectId));
    }

    if (orgId) {
      tags.push(CacheTags.knowledgeEntries("org", orgId));
      tags.push(CacheTags.knowledgeDocuments("org", orgId));
    }

    // Invalidate global
    tags.push(CacheTags.knowledgeEntries("global"));
    tags.push(CacheTags.knowledgeDocuments("global"));

    // Invalidate hierarchy tag if both IDs provided
    if (projectId && orgId) {
      const hierarchyTag = CacheTags.knowledgeHierarchy(projectId, orgId);
      if (hierarchyTag) {
        tags.push(hierarchyTag);
      }
    }

    invalidateCache(...tags);
  },

  /**
   * Invalidate team cache
   */
  invalidateTeamCache(
    orgCode: string,
    teamId?: string,
    _departmentId?: string
  ): void {
    const tags = [CacheTags.teamsByOrg(orgCode)];
    if (teamId) {
      tags.push(CacheTags.team(teamId));
    }
    // Note: teamsByDepartment cache tag not implemented as Better Auth doesn't support departments
    invalidateCache(...tags);
  },

  /**
   * Invalidate user teams cache
   */
  invalidateUserTeamsCache(userId: string, orgCode: string): void {
    invalidateCache(CacheTags.userTeams(userId, orgCode));
  },

  /**
   * Invalidate all organizations cache (for superadmin)
   */
  invalidateOrganizations(): void {
    invalidateCache(CacheTags.organizations());
  },

  /**
   * Invalidate organization members cache
   */
  invalidateOrganizationMembers(orgCode: string): void {
    invalidateCache(CacheTags.orgMembers(orgCode));
  },

  /**
   * Invalidate team members cache
   */
  invalidateTeamMembers(teamId: string): void {
    invalidateCache(CacheTags.teamMembers(teamId));
  },
} as const;

