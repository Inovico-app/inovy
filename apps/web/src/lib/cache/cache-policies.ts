import { CacheTags } from "../cache-utils";
import type { CachePolicy, InvalidationContext } from "./types";

/**
 * Builds cache tags for the knowledge base hierarchy.
 *
 * Maps the public "organization" scope label to the internal "org" scope used
 * by CacheTags. Guards against null/undefined scopeId for non-global scopes —
 * if scopeId is absent for a non-global scope, falls back to global tags only
 * rather than throwing.
 *
 * @param scope        - The knowledge scope ("project" | "organization" | "global" | "team")
 * @param scopeId      - The ID for the scope entity (null/undefined is safe; triggers fallback)
 * @param organizationId - The organization UUID (used for project-scope hierarchy tags)
 */
export function buildKnowledgeTags(
  scope: "project" | "organization" | "global" | "team",
  scopeId: string | null | undefined,
  organizationId: string,
): string[] {
  const globalTags = [
    CacheTags.knowledgeEntries("global"),
    CacheTags.knowledgeDocuments("global"),
  ];

  if (scope === "global") {
    return globalTags;
  }

  // Guard: fall back to global-only when scopeId is missing for non-global scopes.
  // CacheTags.knowledgeEntries/knowledgeDocuments throw if scopeId is absent for
  // non-global scopes, so we must not call them.
  if (!scopeId) {
    return globalTags;
  }

  if (scope === "organization") {
    return [
      CacheTags.knowledgeEntries("org", scopeId),
      CacheTags.knowledgeDocuments("org", scopeId),
      ...globalTags,
    ];
  }

  if (scope === "team") {
    return [
      CacheTags.knowledgeEntries("team", scopeId),
      CacheTags.knowledgeDocuments("team", scopeId),
      ...globalTags,
    ];
  }

  // scope === "project"
  const tags: string[] = [
    CacheTags.knowledgeEntries("project", scopeId),
    CacheTags.knowledgeDocuments("project", scopeId),
    CacheTags.knowledgeEntries("org", organizationId),
    CacheTags.knowledgeDocuments("org", organizationId),
    ...globalTags,
  ];

  const hierarchyTag = CacheTags.knowledgeHierarchy(scopeId, organizationId);
  if (hierarchyTag) {
    tags.push(hierarchyTag);
  }

  return tags;
}

// ---------------------------------------------------------------------------
// Shared helpers — reused by policies that share the same tag set
// ---------------------------------------------------------------------------

/** Tags for invalidating project list caches (no specific project). */
function projectListTags(ctx: InvalidationContext): string[] {
  return [
    CacheTags.projectsByOrg(ctx.organizationId),
    CacheTags.projectCount(ctx.organizationId),
    CacheTags.dashboardStats(ctx.organizationId),
    CacheTags.recentProjects(ctx.organizationId),
  ];
}

/** Tags for invalidating a specific project + its list caches. */
function projectTags(ctx: InvalidationContext): string[] {
  const projectId = ctx.input.projectId as string | undefined;
  if (!projectId) return projectListTags(ctx);
  const tags = [
    CacheTags.project(projectId),
    CacheTags.projectTemplate(projectId),
  ];
  if (ctx.organizationId) {
    tags.push(
      CacheTags.projectsByOrg(ctx.organizationId),
      CacheTags.projectCount(ctx.organizationId),
      CacheTags.dashboardStats(ctx.organizationId),
      CacheTags.recentProjects(ctx.organizationId),
    );
  }
  return tags;
}

/** Tags for invalidating recording list caches (no specific recording). */
function recordingListTags(ctx: InvalidationContext): string[] {
  const projectId = ctx.input.projectId as string | undefined;
  const tags: string[] = [];
  if (projectId) {
    tags.push(CacheTags.recordingsByProject(projectId));
  }
  if (ctx.organizationId) {
    tags.push(
      CacheTags.recordingsByOrg(ctx.organizationId),
      CacheTags.dashboardStats(ctx.organizationId),
      CacheTags.recentRecordings(ctx.organizationId),
    );
  }
  return tags;
}

/** Tags for invalidating a specific recording + its list caches. */
function recordingTags(ctx: InvalidationContext): string[] {
  const recordingId = ctx.input.recordingId as string | undefined;
  const tags: string[] = [];
  if (recordingId) {
    tags.push(CacheTags.recording(recordingId));
  }
  tags.push(...recordingListTags(ctx));
  return tags;
}

/** Tags for invalidating knowledge base caches. */
function knowledgeTags(ctx: InvalidationContext): string[] {
  const scope = ctx.input.scope as
    | "project"
    | "organization"
    | "global"
    | "team";
  const scopeId = ctx.input.scopeId as string | null | undefined;
  return buildKnowledgeTags(scope, scopeId, ctx.organizationId);
}

/** Tags for invalidating meeting agenda items. */
function agendaTags(ctx: InvalidationContext): string[] {
  const meetingId = ctx.input.meetingId as string;
  return [CacheTags.meetingAgendaItems(meetingId)];
}

// ---------------------------------------------------------------------------
// CACHE_POLICIES registry
// ---------------------------------------------------------------------------

/**
 * Registry of cache policies keyed by `"resourceType:action"`.
 *
 * Each entry is a pure function that, given an {@link InvalidationContext},
 * returns the list of cache tag strings that should be invalidated.
 */
export const CACHE_POLICIES: Record<string, CachePolicy> = {
  // ── Projects ──────────────────────────────────────────────────────────
  "project:create": (ctx) => projectListTags(ctx),
  "project:update": (ctx) => projectTags(ctx),
  "project:delete": (ctx) => projectTags(ctx),
  "project:archive": (ctx) => projectTags(ctx),
  "project:restore": (ctx) => projectTags(ctx),

  // ── Recordings ────────────────────────────────────────────────────────
  "recording:upload": (ctx) => recordingListTags(ctx),
  "recording:update": (ctx) => recordingTags(ctx),
  "recording:delete": (ctx) => recordingTags(ctx),
  "recording:archive": (ctx) => recordingTags(ctx),
  "recording:restore": (ctx) => recordingTags(ctx),
  "recording:move": (ctx) => {
    const recordingId = ctx.input.recordingId as string | undefined;
    const oldProjectId = ctx.input.oldProjectId as string | undefined;
    const newProjectId = ctx.input.newProjectId as string | undefined;
    const projectId = ctx.input.projectId as string | undefined;
    const tags: string[] = [];
    if (recordingId) {
      tags.push(CacheTags.recording(recordingId));
    }
    if (ctx.organizationId) {
      tags.push(
        CacheTags.recordingsByOrg(ctx.organizationId),
        CacheTags.dashboardStats(ctx.organizationId),
        CacheTags.recentRecordings(ctx.organizationId),
      );
    }
    // Invalidate both old and new project recording lists
    if (oldProjectId) {
      tags.push(CacheTags.recordingsByProject(oldProjectId));
    }
    if (newProjectId) {
      tags.push(CacheTags.recordingsByProject(newProjectId));
    }
    // Fallback: if only a generic projectId is provided
    if (projectId && projectId !== oldProjectId && projectId !== newProjectId) {
      tags.push(CacheTags.recordingsByProject(projectId));
    }
    return tags;
  },
  "recording:reprocess": (ctx) => {
    const recordingId = ctx.input.recordingId as string;
    const projectId = ctx.input.projectId as string | undefined;
    const tags = [
      CacheTags.recording(recordingId),
      CacheTags.summary(recordingId),
    ];
    if (projectId) {
      tags.push(CacheTags.recordingsByProject(projectId));
    }
    if (ctx.organizationId) {
      tags.push(
        CacheTags.recordingsByOrg(ctx.organizationId),
        CacheTags.dashboardStats(ctx.organizationId),
        CacheTags.recentRecordings(ctx.organizationId),
      );
    }
    return tags;
  },

  // ── Knowledge Base ────────────────────────────────────────────────────
  "knowledge_base:create": (ctx) => knowledgeTags(ctx),
  "knowledge_base:update": (ctx) => knowledgeTags(ctx),
  "knowledge_base:delete": (ctx) => knowledgeTags(ctx),
  "knowledge_base_document:delete": (ctx) => knowledgeTags(ctx),
  "knowledge_base_document:upload": (ctx) => knowledgeTags(ctx),

  // ── Meetings ──────────────────────────────────────────────────────────
  "meeting:create": (ctx) => [
    CacheTags.meetings(ctx.organizationId),
    CacheTags.calendarMeetings(ctx.userId, ctx.organizationId),
  ],
  "meeting:update": (ctx) => {
    const meetingId = ctx.input.meetingId as string;
    return [
      CacheTags.meeting(meetingId),
      CacheTags.meetings(ctx.organizationId),
      CacheTags.calendarMeetings(ctx.userId, ctx.organizationId),
    ];
  },

  // ── Agenda ────────────────────────────────────────────────────────────
  "agenda:create": (ctx) => agendaTags(ctx),
  "agenda:update": (ctx) => agendaTags(ctx),
  "agenda:delete": (ctx) => agendaTags(ctx),
  "agenda:generate": (ctx) => agendaTags(ctx),

  // ── Bot Settings ──────────────────────────────────────────────────────
  "bot_settings:update": (ctx) => [
    CacheTags.botSettings(ctx.userId, ctx.organizationId),
  ],

  // ── Bot Sessions ──────────────────────────────────────────────────────
  "bot_session:create": (ctx) => [CacheTags.botSessions(ctx.organizationId)],
  "bot_session:update": (ctx) => {
    const sessionId = ctx.input.sessionId as string;
    return [
      CacheTags.botSession(sessionId),
      CacheTags.botSessions(ctx.organizationId),
    ];
  },
  "bot_session:delete": (ctx) => {
    const sessionId = ctx.input.sessionId as string;
    return [
      CacheTags.botSession(sessionId),
      CacheTags.botSessions(ctx.organizationId),
      CacheTags.notifications(ctx.userId, ctx.organizationId),
      CacheTags.notificationUnreadCount(ctx.userId, ctx.organizationId),
    ];
  },

  // ── Organizations ─────────────────────────────────────────────────────
  "organization:create": () => [CacheTags.organizations()],
  "organization:update": (ctx) => [
    CacheTags.organization(ctx.organizationId),
    CacheTags.organizations(),
  ],
  "organization:delete": (ctx) => [
    CacheTags.organization(ctx.organizationId),
    CacheTags.organizations(),
  ],

  // ── Consent ──────────────────────────────────────────────────────────
  "consent:grant": (ctx) => {
    const recordingId = ctx.input.recordingId as string | undefined;
    if (!recordingId) return [];
    return [CacheTags.consentParticipants(recordingId, ctx.organizationId)];
  },
  "consent:revoke": (ctx) => {
    const recordingId = ctx.input.recordingId as string | undefined;
    if (!recordingId) return [];
    return [CacheTags.consentParticipants(recordingId, ctx.organizationId)];
  },

  // ── Organization Settings ──────────────────────────────────────────
  "organization_settings:update": (ctx) => [
    CacheTags.organizationSettings(ctx.organizationId),
  ],

  // ── Settings ──────────────────────────────────────────────────────────
  "settings:update": (ctx) => [
    CacheTags.organization(ctx.organizationId),
    CacheTags.organizations(),
    CacheTags.agentSettings(),
  ],

  // ── Invitations ───────────────────────────────────────────────────────
  "invitation:invite": (ctx) => [
    CacheTags.organization(ctx.organizationId),
    CacheTags.orgMembers(ctx.organizationId),
  ],

  // ── Notifications ───────────────────────────────────────────────────
  "notification:update": (ctx) => [
    CacheTags.notifications(ctx.userId, ctx.organizationId),
    CacheTags.notificationUnreadCount(ctx.userId, ctx.organizationId),
  ],

  // ── Integrations ──────────────────────────────────────────────────────
  "integration:disconnect": (ctx) => {
    const provider = ctx.input.provider as string;
    if (provider === "google") {
      return [CacheTags.googleConnection(ctx.userId)];
    }
    if (provider === "microsoft") {
      return [CacheTags.microsoftConnection(ctx.userId)];
    }
    return [];
  },

  // ── Project Templates ─────────────────────────────────────────────────
  "project_template:create": (ctx) => {
    const projectId = ctx.input.projectId as string;
    return [
      CacheTags.project(projectId),
      CacheTags.projectTemplate(projectId),
      CacheTags.projectsByOrg(ctx.organizationId),
      CacheTags.dashboardStats(ctx.organizationId),
      CacheTags.recentProjects(ctx.organizationId),
    ];
  },
  "project_template:update": (ctx) => {
    const projectId = ctx.input.projectId as string;
    return [CacheTags.projectTemplate(projectId)];
  },
  "project_template:delete": (ctx) => {
    const projectId = ctx.input.projectId as string;
    return [
      CacheTags.project(projectId),
      CacheTags.projectTemplate(projectId),
      CacheTags.projectsByOrg(ctx.organizationId),
      CacheTags.dashboardStats(ctx.organizationId),
      CacheTags.recentProjects(ctx.organizationId),
    ];
  },
};
