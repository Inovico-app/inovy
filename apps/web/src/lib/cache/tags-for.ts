import { CacheTags } from "../cache-utils";
import type { CacheEntity } from "./types";

/**
 * Refs bag passed to tagsFor.
 * All fields are optional — tagsFor filters out tags whose required refs
 * are missing rather than throwing.
 */
export interface CacheRefs {
  projectId?: string;
  organizationId?: string;
  userId?: string;
  recordingId?: string;
  taskId?: string;
  sessionId?: string;
  conversationId?: string;
  teamId?: string;
  invitationId?: string;
  meetingId?: string;
  insightType?: string;
  /**
   * Knowledge scope: "project" | "org" | "global" | "team".
   * Stored as string to avoid coupling callers to the internal union type.
   */
  scope?: string;
  scopeId?: string;
}

/**
 * Maps a CacheEntity + refs to the matching CacheTags tag strings.
 *
 * Rules:
 * - Tags whose required refs are missing are silently omitted.
 * - Returns an empty array when no refs satisfy any tag for the entity.
 * - For knowledge entities the scope is forwarded as-is; callers are
 *   responsible for passing a valid scope string.
 */
export function tagsFor(entity: CacheEntity, refs: CacheRefs = {}): string[] {
  const tags: Array<string | undefined> = [];

  switch (entity) {
    case "project":
      if (refs.projectId) tags.push(CacheTags.project(refs.projectId));
      if (refs.organizationId)
        tags.push(CacheTags.projectsByOrg(refs.organizationId));
      break;

    case "recording":
      if (refs.recordingId) tags.push(CacheTags.recording(refs.recordingId));
      if (refs.projectId)
        tags.push(CacheTags.recordingsByProject(refs.projectId));
      if (refs.organizationId)
        tags.push(CacheTags.recordingsByOrg(refs.organizationId));
      break;

    case "task":
      if (refs.userId && refs.organizationId) {
        tags.push(CacheTags.tasksByUser(refs.userId, refs.organizationId));
        tags.push(CacheTags.taskStats(refs.userId, refs.organizationId));
      }
      if (refs.organizationId)
        tags.push(CacheTags.tasksByOrg(refs.organizationId));
      break;

    case "taskTags":
      if (refs.taskId) tags.push(CacheTags.taskTagsForTask(refs.taskId));
      if (refs.organizationId)
        tags.push(CacheTags.taskTags(refs.organizationId));
      break;

    case "aiInsight":
      if (refs.recordingId && refs.insightType)
        tags.push(
          CacheTags.aiInsightByType(refs.recordingId, refs.insightType),
        );
      break;

    case "summary":
      if (refs.recordingId) tags.push(CacheTags.summary(refs.recordingId));
      break;

    case "consent":
      if (refs.recordingId && refs.organizationId)
        tags.push(
          CacheTags.consentParticipants(refs.recordingId, refs.organizationId),
        );
      break;

    case "user":
      if (refs.userId) tags.push(CacheTags.user(refs.userId));
      if (refs.organizationId)
        tags.push(CacheTags.usersByOrg(refs.organizationId));
      break;

    case "organization":
      if (refs.organizationId)
        tags.push(CacheTags.organization(refs.organizationId));
      break;

    case "orgSettings":
      if (refs.organizationId)
        tags.push(CacheTags.organizationSettings(refs.organizationId));
      break;

    case "orgInstructions":
      if (refs.organizationId)
        tags.push(CacheTags.organizationInstructions(refs.organizationId));
      break;

    case "orgMembers":
      if (refs.organizationId)
        tags.push(CacheTags.orgMembers(refs.organizationId));
      break;

    case "notification":
      if (refs.userId && refs.organizationId) {
        tags.push(CacheTags.notifications(refs.userId, refs.organizationId));
      }
      break;

    case "notificationUnreadCount":
      if (refs.userId && refs.organizationId) {
        tags.push(
          CacheTags.notificationUnreadCount(refs.userId, refs.organizationId),
        );
      }
      break;

    case "botSettings":
      if (refs.userId && refs.organizationId)
        tags.push(CacheTags.botSettings(refs.userId, refs.organizationId));
      break;

    case "botSession":
      if (refs.sessionId) tags.push(CacheTags.botSession(refs.sessionId));
      break;

    case "botSessions":
      if (refs.organizationId)
        tags.push(CacheTags.botSessions(refs.organizationId));
      break;

    case "calendarMeetings":
      if (refs.userId && refs.organizationId)
        tags.push(CacheTags.calendarMeetings(refs.userId, refs.organizationId));
      break;

    case "dashboard":
      if (refs.organizationId) {
        tags.push(CacheTags.dashboardStats(refs.organizationId));
        tags.push(CacheTags.recentProjects(refs.organizationId));
        tags.push(CacheTags.recentRecordings(refs.organizationId));
      }
      break;

    case "autoActions":
      if (refs.userId) {
        tags.push(CacheTags.autoActions(refs.userId));
        tags.push(CacheTags.autoActionStats(refs.userId));
      }
      break;

    case "transcriptionHistory":
      if (refs.recordingId)
        tags.push(CacheTags.transcriptionHistory(refs.recordingId));
      break;

    case "summaryHistory":
      if (refs.recordingId)
        tags.push(CacheTags.summaryHistory(refs.recordingId));
      break;

    case "conversation":
      if (refs.userId && refs.organizationId)
        tags.push(CacheTags.conversations(refs.userId, refs.organizationId));
      if (refs.conversationId)
        tags.push(CacheTags.conversationMessages(refs.conversationId));
      break;

    case "driveWatch":
      if (refs.userId) tags.push(CacheTags.driveWatches(refs.userId));
      break;

    case "googleConnection":
      if (refs.userId) tags.push(CacheTags.googleConnection(refs.userId));
      break;

    case "microsoftConnection":
      if (refs.userId) tags.push(CacheTags.microsoftConnection(refs.userId));
      break;

    case "knowledge": {
      const scope = refs.scope as
        | "project"
        | "org"
        | "global"
        | "team"
        | undefined;
      if (!scope) break;
      // Guard: knowledgeEntries throws when scopeId is missing for non-global scopes
      if (scope === "global") {
        tags.push(CacheTags.knowledgeEntries("global"));
      } else if (refs.scopeId) {
        tags.push(CacheTags.knowledgeEntries(scope, refs.scopeId));
      }
      break;
    }

    case "knowledgeDocuments": {
      const scope = refs.scope as
        | "project"
        | "org"
        | "global"
        | "team"
        | undefined;
      if (!scope) break;
      // Guard: knowledgeDocuments throws when scopeId is missing for non-global scopes
      if (scope === "global") {
        tags.push(CacheTags.knowledgeDocuments("global"));
      } else if (refs.scopeId) {
        tags.push(CacheTags.knowledgeDocuments(scope, refs.scopeId));
      }
      break;
    }

    case "knowledgeHierarchy": {
      // knowledgeHierarchy returns string | undefined — filter handled below
      const hierarchyTag = CacheTags.knowledgeHierarchy(
        refs.projectId,
        refs.organizationId,
      );
      tags.push(hierarchyTag);
      break;
    }

    case "team":
      if (refs.teamId) tags.push(CacheTags.team(refs.teamId));
      if (refs.organizationId)
        tags.push(CacheTags.teamsByOrg(refs.organizationId));
      break;

    case "teamMembers":
      if (refs.teamId) tags.push(CacheTags.teamMembers(refs.teamId));
      break;

    case "userTeams":
      if (refs.userId && refs.organizationId)
        tags.push(CacheTags.userTeams(refs.userId, refs.organizationId));
      break;

    case "organizations":
      tags.push(CacheTags.organizations());
      break;

    case "invitation":
      if (refs.invitationId) tags.push(CacheTags.invitation(refs.invitationId));
      break;

    case "meeting":
      if (refs.meetingId) tags.push(CacheTags.meeting(refs.meetingId));
      break;

    case "meetingAgendaItems":
      if (refs.meetingId)
        tags.push(CacheTags.meetingAgendaItems(refs.meetingId));
      break;

    case "meetingNotes":
      if (refs.meetingId) tags.push(CacheTags.meetingNotes(refs.meetingId));
      break;

    case "meetingPostActions":
      if (refs.meetingId)
        tags.push(CacheTags.meetingPostActions(refs.meetingId));
      break;

    case "meetingTemplates":
      if (refs.organizationId)
        tags.push(CacheTags.meetingTemplates(refs.organizationId));
      break;

    case "projectTemplate":
      if (refs.projectId) tags.push(CacheTags.projectTemplate(refs.projectId));
      break;

    case "agentSettings":
      tags.push(CacheTags.agentSettings());
      break;

    case "agentAnalytics":
      tags.push(CacheTags.agentAnalytics());
      if (refs.organizationId)
        tags.push(CacheTags.agentAnalyticsByOrg(refs.organizationId));
      if (refs.userId) tags.push(CacheTags.agentAnalyticsByUser(refs.userId));
      break;
  }

  // Filter out undefined values (e.g. knowledgeHierarchy returning undefined)
  return tags.filter((t): t is string => t !== undefined);
}
