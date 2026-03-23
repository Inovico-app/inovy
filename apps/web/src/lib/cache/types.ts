/**
 * Context available to cache policy functions.
 * Assembled from the action middleware ctx + parsedInput + result.
 */
export interface InvalidationContext {
  /** User ID from auth session */
  readonly userId: string;
  /** Organization UUID — used for all org-scoped tags (same value as orgCode) */
  readonly organizationId: string;
  /** Team IDs the user belongs to */
  readonly userTeamIds: string[];
  /** The Zod-validated input from the action */
  readonly input: Record<string, unknown>;
  /** The return value of the action (only on success) */
  readonly result: unknown;
}

/**
 * A cache policy is a pure function: given context, return tag strings to invalidate.
 */
export type CachePolicy = (ctx: InvalidationContext) => string[];

/**
 * Entity names for type-safe tag generation in cache wrappers.
 */
export type CacheEntity =
  | "project"
  | "recording"
  | "task"
  | "taskTags"
  | "aiInsight"
  | "summary"
  | "consent"
  | "user"
  | "organization"
  | "orgSettings"
  | "orgInstructions"
  | "orgMembers"
  | "notification"
  | "botSettings"
  | "botSession"
  | "botSessions"
  | "calendarMeetings"
  | "dashboard"
  | "autoActions"
  | "transcriptionHistory"
  | "summaryHistory"
  | "conversation"
  | "driveWatch"
  | "googleConnection"
  | "microsoftConnection"
  | "knowledge"
  | "knowledgeDocuments"
  | "knowledgeHierarchy"
  | "team"
  | "teamMembers"
  | "userTeams"
  | "organizations"
  | "invitation"
  | "meeting"
  | "meetingAgendaItems"
  | "meetingNotes"
  | "meetingPostActions"
  | "meetingTemplates"
  | "projectTemplate"
  | "agentSettings"
  | "agentAnalytics";
