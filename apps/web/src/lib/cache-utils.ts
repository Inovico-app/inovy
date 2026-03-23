import { updateTag as nextUpdateTag } from "next/cache";

/**
 * Cache tag utilities for Next.js 16 cache system
 * Replaces Redis key patterns with tag-based invalidation
 */

/**
 * Generate cache tags for different entity types
 */
export const CacheTags = {
  // Agent settings tags
  agentSettings: () => `agent-settings`,

  // Agent analytics tags
  agentAnalytics: () => `agent-analytics`,
  agentAnalyticsByOrg: (orgId: string) => `agent-analytics:org:${orgId}`,
  agentAnalyticsByUser: (userId: string) => `agent-analytics:user:${userId}`,

  // Project tags
  project: (projectId: string) => `project:${projectId}`,
  projectsByOrg: (orgCode: string) => `projects:org:${orgCode}`,
  projectCount: (orgCode: string) => `project-count:org:${orgCode}`,
  projectsByUser: (userId: string) => `projects:user:${userId}`,

  // Project template tags
  projectTemplate: (projectId: string) => `project-template:${projectId}`,

  // Task tags
  tasksByUser: (userId: string, orgCode: string) =>
    `tasks:user:${userId}:org:${orgCode}`,
  tasksByOrg: (orgCode: string) => `tasks:org:${orgCode}`,
  tasksByRecording: (recordingId: string) => `tasks:recording:${recordingId}`,
  taskStats: (userId: string, orgCode: string) =>
    `task-stats:user:${userId}:org:${orgCode}`,
  taskTags: (orgCode: string) => `task-tags:org:${orgCode}`,
  taskTagsForTask: (taskId: string) => `task-tags:task:${taskId}`,

  // AI insight tags
  aiInsightByType: (recordingId: string, insightType: string) =>
    `ai-insight:${recordingId}:type:${insightType}`,

  // Summary tags
  summary: (recordingId: string) => `summary:${recordingId}`,

  // Consent tags
  consentParticipants: (recordingId: string, organizationId: string) =>
    `consent-participants:${recordingId}:org:${organizationId}`,

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

  // Google Connection tags
  googleConnection: (userId: string) => `google-connection-${userId}`,

  // Microsoft Connection tags
  microsoftConnection: (userId: string) => `microsoft-connection-${userId}`,

  // Bot Settings tags
  // Note: Uses organizationId (UUID) instead of orgCode (slug) for consistency with bot settings schema
  botSettings: (userId: string, organizationId: string) =>
    `bot-settings:${userId}:${organizationId}`,

  // Bot Sessions tags
  // Note: Uses organizationId (UUID) instead of orgCode (slug) for consistency with bot sessions schema
  botSessions: (organizationId: string) => `bot-sessions:org:${organizationId}`,
  botSession: (sessionId: string) => `bot-session:${sessionId}`,
  botSessionsByStatus: (organizationId: string, status: string) =>
    `bot-sessions:org:${organizationId}:status:${status}`,

  // Calendar Meetings tags
  calendarMeetings: (userId: string, organizationId: string) =>
    `calendar-meetings:user:${userId}:org:${organizationId}`,

  // Knowledge Base tags
  knowledgeEntries: (
    scope: "project" | "org" | "global" | "team",
    scopeId?: string,
  ): string => {
    if (scope === "global") {
      return `knowledge-entries:global`;
    }
    if (!scopeId) {
      throw new Error(
        `scopeId is required for ${scope} scope in knowledgeEntries`,
      );
    }
    if (scope === "org") {
      return `knowledge-entries:org:${scopeId}`;
    }
    if (scope === "team") {
      return `knowledge-entries:team:${scopeId}`;
    }
    return `knowledge-entries:project:${scopeId}`;
  },
  knowledgeDocuments: (
    scope: "project" | "org" | "global" | "team",
    scopeId?: string,
  ): string => {
    if (scope === "global") {
      return `knowledge-documents:global`;
    }
    if (!scopeId) {
      throw new Error(
        `scopeId is required for ${scope} scope in knowledgeDocuments`,
      );
    }
    if (scope === "org") {
      return `knowledge-documents:org:${scopeId}`;
    }
    if (scope === "team") {
      return `knowledge-documents:team:${scopeId}`;
    }
    return `knowledge-documents:project:${scopeId}`;
  },
  knowledgeHierarchy: (projectId?: string, orgId?: string) =>
    projectId && orgId
      ? `knowledge-hierarchy:project:${projectId}:org:${orgId}`
      : undefined,

  // Team tags
  team: (teamId: string) => `team:${teamId}`,
  teamsByOrg: (orgCode: string) => `teams:org:${orgCode}`,
  teamMembers: (teamId: string) => `team-members:${teamId}`,
  teamsByDepartment: (departmentId: string) =>
    `teams:department:${departmentId}`,
  userTeams: (userId: string, orgCode: string) =>
    `user-teams:user:${userId}:org:${orgCode}`,

  // Organization list tags (for superadmin)
  organizations: () => `organizations:all`,

  // Invitation tags
  invitation: (invitationId: string) => `invitation:${invitationId}`,

  // Meeting tags
  meetings: (organizationId: string) => `meetings:org:${organizationId}`,
  meeting: (meetingId: string) => `meeting:${meetingId}`,
  meetingAgendaItems: (meetingId: string) =>
    `meeting-agenda-items:${meetingId}`,
  meetingNotes: (meetingId: string) => `meeting-notes:${meetingId}`,
  meetingPostActions: (meetingId: string) =>
    `meeting-post-actions:${meetingId}`,
  meetingTemplates: (organizationId: string) =>
    `meeting-templates:org:${organizationId}`,
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
