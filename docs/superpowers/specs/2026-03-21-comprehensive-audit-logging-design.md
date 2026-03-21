# Comprehensive Audit Logging

**Date:** 2026-03-21
**Status:** Draft (rev 2 — post spec review)
**Author:** Claude + Nigel

## Problem

Out of ~168 server action functions, only ~9 create audit log entries. The existing audit log infrastructure (schema, service, hash chain, admin UI) is solid, but coverage is sparse. Government clients require full audit trails for every action — both mutations and reads — across all entities.

## Goals

1. Every server action invocation produces an audit log entry automatically
2. Distinguish between `mutation` and `read` categories, defaulting the UI to show mutations only
3. Migrate from a rigid `eventType` enum to a flexible `{resource}_{action}` text convention
4. Expand resource type and action enums to cover all entities
5. Remove existing manual audit log calls; replace with middleware-driven logging + opt-in enrichment
6. Wire Better Auth hooks for auth lifecycle events (login, logout, sign-up, etc.)
7. Migrate ~13 plain async function server actions to use action clients, or add explicit audit calls

## Non-Goals

- Auditing raw API route hits (only server actions and auth events)
- Real-time audit log streaming or alerting
- Changes to consent audit log or chat audit log tables (they remain separate)
- Data retention/archival policy (deferred to future spec)

## Design

### 1. Schema Changes

#### 1.1 New `category` Column

Add `audit_category` enum and column to `audit_logs`:

```typescript
export const auditCategoryEnum = pgEnum("audit_category", ["mutation", "read"]);
```

Column: `category: auditCategoryEnum("category").notNull()`

Existing rows receive `"mutation"` as default (all current logs are mutations).

#### 1.2 Replace `eventType` Enum with Text

The current `auditEventTypeEnum` has 36 values, many unused. Replace with a `text` column using the convention `{resourceType}_{action}` (e.g., `meeting_create`, `recording_read`, `task_update`).

This eliminates the need for a DB migration every time a new entity or action is added.

```typescript
// Before
eventType: auditEventTypeEnum("event_type").notNull(),

// After
eventType: text("event_type").notNull(),
```

**Historical data note:** Existing rows have values like `project_created` (past tense) while the new convention uses `project_create` (present tense, matching the action enum). This inconsistency is acceptable — both are queryable text. A one-time data migration to normalize historical values is optional and can be done later if needed.

#### 1.3 Change `resourceId` from UUID to Text

The current schema uses `uuid("resource_id")`, but many resource IDs in the codebase are nanoid strings (Better Auth user IDs, organization IDs, team IDs, member IDs). This would cause type errors when logging auth-related resources.

```typescript
// Before
resourceId: uuid("resource_id"),

// After
resourceId: text("resource_id"),
```

#### 1.4 Expand `resourceType` Enum

Add missing resource types to cover all entities:

```typescript
export const auditResourceTypeEnum = pgEnum("audit_resource_type", [
  // Existing
  "recording",
  "task",
  "user",
  "project",
  "organization",
  "permission",
  "role",
  "export",
  "integration",
  "settings",
  "consent",
  "knowledge_base",
  "chat",
  // New
  "meeting",
  "bot_session",
  "bot_settings",
  "bot_subscription",
  "notification",
  "team",
  "onboarding",
  "auto_action",
  "agenda",
  "agenda_template",
  "share_token",
  "drive_watch",
  "knowledge_base_document",
  "project_template",
  "redaction",
  "privacy_request",
  "data_export",
  "invitation",
  "calendar",
  "audit_log",
  "blob",
]);
```

#### 1.5 Expand `action` Enum

Add missing action types:

```typescript
export const auditActionEnum = pgEnum("audit_action", [
  // Existing
  "create",
  "read",
  "update",
  "delete",
  "export",
  "import",
  "archive",
  "restore",
  "grant",
  "revoke",
  "assign",
  "unassign",
  "connect",
  "disconnect",
  "sync",
  // New
  "start",
  "cancel",
  "retry",
  "subscribe",
  "unsubscribe",
  "complete",
  "uncomplete",
  "move",
  "reprocess",
  "upload",
  "download",
  "redact",
  "invite",
  "accept",
  "reject",
  "mark_read",
  "generate",
  "login",
  "logout",
  "verify",
  "reset",
  "list",
  "get",
  "search",
  "detect",
  "apply",
  "check",
]);
```

### 2. Middleware Design

#### 2.1 Audit Metadata on Actions

Extend the action metadata schema to include audit information:

```typescript
const schemaMetadata = z.object({
  name: z.string().optional(),
  permissions: z.record(z.string(), z.array(z.string())),
  skipAuth: z.boolean().optional(),
  audit: z
    .object({
      resourceType: z.string(),
      action: z.string(),
      category: z.enum(["mutation", "read"]),
    })
    .optional(),
});
```

Every `authorizedActionClient` action annotates itself:

```typescript
export const createProjectAction = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("project:create"),
    name: "create-project",
    audit: {
      resourceType: "project",
      action: "create",
      category: "mutation",
    },
  })
  .inputSchema(createProjectSchema)
  .action(async ({ parsedInput, ctx }) => {
    // ... business logic ...

    // Optional enrichment
    ctx.audit.setResourceId(project.id);
    ctx.audit.setMetadata({ projectName: parsedInput.name });

    return resultToActionResponse(result);
  });
```

#### 2.2 Audit Context Object

The middleware injects an `audit` context object into every action:

```typescript
interface AuditContext {
  setResourceId(id: string): void;
  setMetadata(metadata: Record<string, unknown>): void;
}
```

This is a simple mutable holder that the middleware reads after the action completes:

```typescript
class AuditContextImpl implements AuditContext {
  resourceId: string | null = null;
  metadata: Record<string, unknown> | null = null;

  setResourceId(id: string): void {
    this.resourceId = id;
  }

  setMetadata(metadata: Record<string, unknown>): void {
    this.metadata = { ...this.metadata, ...metadata };
  }
}
```

#### 2.3 Audit Logging Middleware (authorizedActionClient)

A new middleware added to the `authorizedActionClient` chain, positioned after authentication so it has access to `ctx.user` and `ctx.organizationId`:

```
authorizedActionClient middleware chain:
  1. actionLoggerMiddleware (existing — execution logging)
  2. authenticationMiddleware (existing — auth + RBAC)
  3. auditLoggingMiddleware (NEW — creates audit log entry)
```

Middleware pseudocode:

```typescript
async function auditLoggingMiddleware({ next, ctx, metadata }) {
  const auditCtx = new AuditContextImpl();
  const auditMeta = metadata.audit;

  // Extract request info early (before action runs)
  const headersList = await headers();
  const { ipAddress, userAgent } =
    AuditLogService.extractRequestInfo(headersList);

  let actionSucceeded = true;

  try {
    const result = await next({
      ctx: { ...ctx, audit: auditCtx },
    });
    return result;
  } catch (error) {
    actionSucceeded = false;
    throw error;
  } finally {
    // Always log, even on failure
    if (ctx.user && ctx.organizationId && auditMeta) {
      const eventType = `${auditMeta.resourceType}_${auditMeta.action}`;

      // Fire-and-forget: audit logging must never block the response
      void AuditLogService.createAuditLog({
        eventType,
        resourceType: auditMeta.resourceType,
        resourceId: auditCtx.resourceId,
        userId: ctx.user.id,
        organizationId: ctx.organizationId,
        action: auditMeta.action,
        category: auditMeta.category,
        ipAddress,
        userAgent,
        metadata: {
          ...auditCtx.metadata,
          actionName: metadata.name,
          success: actionSucceeded,
        },
      });
    } else if (!auditMeta) {
      // Fallback: action has no audit metadata — log with action name only
      // This ensures zero gaps in coverage
      if (ctx.user && ctx.organizationId) {
        void AuditLogService.createAuditLog({
          eventType: `unknown_${metadata.name ?? "action"}`,
          resourceType: "settings", // fallback
          resourceId: null,
          userId: ctx.user.id,
          organizationId: ctx.organizationId,
          action: "read", // conservative fallback
          category: "read",
          ipAddress,
          userAgent,
          metadata: {
            actionName: metadata.name,
            success: actionSucceeded,
            fallback: true,
          },
        });
      }
    }
  }
}
```

Key design decisions:

- **Fire-and-forget (`void`)**: Audit logging never blocks the action response. Failures are caught and logged via `logger.error` inside `AuditLogService.createAuditLog`.
- **Always logs**: Both success and failure cases are captured. The `success` field in metadata distinguishes them.
- **Fallback for unannotated actions**: Actions without `audit` metadata still get logged with a fallback, ensuring zero coverage gaps. The `fallback: true` metadata flag makes these easy to identify and fix.

#### 2.4 Public Action Client Audit Middleware

Auth actions (sign-in, sign-up, magic-link, etc.) use `publicActionClient`, which has no authentication middleware and therefore no `ctx.user` or `ctx.organizationId`. These actions are **not** covered by the `authorizedActionClient` audit middleware.

**Strategy:** Auth actions are covered exclusively by Better Auth hooks (Section 3), not by middleware. The `publicActionClient` does NOT get an audit middleware — auth events are inherently handled at the Better Auth level where session context is available.

The `publicActionClient` chain remains unchanged:

```
publicActionClient middleware chain:
  1. publicActionLoggerMiddleware (existing — execution logging only)
```

#### 2.5 Plain Async Function Actions

~13 server actions are plain `async function` exports with `"use server"` that bypass both action clients entirely:

| Function                         | File                                    | Current Client         |
| -------------------------------- | --------------------------------------- | ---------------------- |
| `getNotifications()`             | notifications/get-notifications.ts      | plain async            |
| `getUnreadCount()`               | notifications/get-unread-count.ts       | plain async            |
| `markNotificationRead()`         | notifications/mark-notification-read.ts | plain async            |
| `markAllNotificationsRead()`     | notifications/mark-all-read.ts          | plain async            |
| `getUserTasks()`                 | tasks/get-user-tasks.ts                 | plain async            |
| `updateTaskStatus()`             | tasks/update-task-status.ts             | plain async            |
| `getUserProjects()`              | projects/get-user-projects.ts           | plain async            |
| `createProjectFormAction()`      | projects/create-project.ts              | plain async            |
| `ensureUserOrganization()`       | auth/ensure-organization.ts             | plain async            |
| `uploadFileToVercelBlobAction()` | actions/vercel-blob.ts                  | plain async            |
| `uploadRecordingFormAction()`    | recordings/upload-recording.ts          | plain async (FormData) |

**Out of scope:** Cookie-based preference helpers (`getAutoProcessPreference`, `setAutoProcessPreference` in `recordings/lib/recording-preferences-server.ts`) and the deletion status lib function (`getDeletionStatus` in `settings/lib/get-deletion-status.ts`) are server-side utilities that don't represent user-initiated actions and are excluded from audit scope.

**Strategy:** Migrate these to `authorizedActionClient` with proper metadata. This is the clean approach — it gives them audit logging, RBAC enforcement, and consistent error handling. The migration is straightforward since they all internally fetch the session already.

Exceptions:

- `ensureUserOrganization()` is called during auth flow before a full session exists. Keep it as a plain function and add an explicit `AuditLogService.createAuditLog()` call inside it.
- `uploadRecordingFormAction()` uses FormData which doesn't work with the action client schema validation. Keep as a plain function and add an explicit `AuditLogService.createAuditLog()` call inside it.

### 3. Auth Event Hooks

Auth events bypass the server action middleware entirely. We use Better Auth's existing hook patterns to create audit log entries.

The codebase already uses `databaseHooks` (for `session.create.before` and `user.create.after`) and `organizationHooks` within the `organization()` plugin. We extend these with audit logging:

```typescript
// In src/lib/auth.ts — extend existing databaseHooks
databaseHooks: {
  // ... existing hooks (session.create.before, user.create.after) ...

  // NEW: Audit logging for auth events
  session: {
    create: {
      before: async (session) => {
        // ... existing session logic ...
      },
      after: async (session) => {
        // Log successful login
        void AuditLogService.createAuditLog({
          eventType: "user_login",
          resourceType: "user",
          resourceId: session.userId,
          userId: session.userId,
          organizationId: session.activeOrganizationId ?? "system",
          action: "login",
          category: "mutation",
          ipAddress: session.ipAddress ?? null,
          userAgent: session.userAgent ?? null,
          metadata: { trigger: "session_create" },
        });
      },
    },
  },
  user: {
    create: {
      after: async (user) => {
        // ... existing ensureUserHasOrganization logic ...

        // NEW: Log user creation
        void AuditLogService.createAuditLog({
          eventType: "user_create",
          resourceType: "user",
          resourceId: user.id,
          userId: user.id,
          organizationId: "system",
          action: "create",
          category: "mutation",
          metadata: { email: user.email },
        });
      },
    },
  },
},
```

For organization-level events, extend the existing `organizationHooks`:

```typescript
// In the organization() plugin config — extend existing hooks
organizationHooks: {
  // ... existing hooks (afterCreateTeam, beforeCreateInvitation, etc.) ...

  // Add audit logging inside existing after* hooks:
  afterCreateTeam: async (data) => {
    // ... existing auto-add creator as member logic ...
    void AuditLogService.createAuditLog({
      eventType: "team_create",
      resourceType: "team",
      resourceId: data.team.id,
      userId: data.user.id,
      organizationId: data.team.organizationId,
      action: "create",
      category: "mutation",
      metadata: { teamName: data.team.name },
    });
  },

  afterAcceptInvitation: async (data) => {
    // ... existing pending team assignment logic ...
    void AuditLogService.createAuditLog({
      eventType: "invitation_accept",
      resourceType: "invitation",
      resourceId: data.invitation.id,
      userId: data.user.id,
      organizationId: data.invitation.organizationId,
      action: "accept",
      category: "mutation",
      metadata: { invitedEmail: data.invitation.email },
    });
  },

  afterRejectInvitation: async (data) => {
    // ... existing rejection logic ...
    void AuditLogService.createAuditLog({
      eventType: "invitation_reject",
      resourceType: "invitation",
      resourceId: data.invitation.id,
      userId: data.user.id,
      organizationId: data.invitation.organizationId,
      action: "reject",
      category: "mutation",
    });
  },

  afterCancelInvitation: async (data) => {
    // ... existing cancellation logic ...
    void AuditLogService.createAuditLog({
      eventType: "invitation_cancel",
      resourceType: "invitation",
      resourceId: data.invitation.id,
      userId: data.user.id,
      organizationId: data.invitation.organizationId,
      action: "cancel",
      category: "mutation",
    });
  },
},
```

For sign-out events, add a route-level handler in the auth API route or use Better Auth's `onSessionEnd` if available. If no hook exists for sign-out, accept this gap and document it — sign-out is the least security-critical auth event.

### 4. Migrate Existing Manual Calls

Remove `AuditLogService.createAuditLog()` from these files and replace with `ctx.audit` enrichment:

| File                                               | Current Manual Call  | Migration                                                    |
| -------------------------------------------------- | -------------------- | ------------------------------------------------------------ |
| `features/projects/actions/create-project.ts`      | `project_created`    | Add `audit` metadata + `ctx.audit.setResourceId(project.id)` |
| `features/projects/actions/update-project.ts`      | `project_updated`    | Add `audit` metadata + `ctx.audit.setResourceId/setMetadata` |
| `features/projects/actions/delete-project.ts`      | `project_deleted`    | Add `audit` metadata + `ctx.audit.setResourceId`             |
| `features/projects/actions/archive-project.ts`     | `project_archived`   | Add `audit` metadata + `ctx.audit.setResourceId`             |
| `features/recordings/actions/delete-recording.ts`  | `recording_deleted`  | Add `audit` metadata + `ctx.audit.setResourceId`             |
| `features/recordings/actions/archive-recording.ts` | `recording_archived` | Add `audit` metadata + `ctx.audit.setResourceId`             |
| `features/admin/actions/export-audit-logs.ts`      | `audit_log_exported` | Add `audit` metadata + `ctx.audit.setMetadata`               |
| `server/services/privacy-request.service.ts`       | `settings_updated`   | Keep as-is (service-level, not action-level)                 |
| `server/services/gdpr-deletion.service.ts`         | references only      | No change needed                                             |

The privacy-request service call stays because it's triggered from a service, not directly from an action handler.

### 5. Action Annotation Catalog

Every server action gets an `audit` metadata annotation. Below is the **complete** mapping of all ~168 exported action functions, organized by feature.

**Note:** Auth actions using `publicActionClient` are NOT in this catalog — they are covered by Better Auth hooks (Section 3). Plain async functions marked with `*` must be migrated to `authorizedActionClient` first (Section 2.5).

#### Admin (25 actions)

| Export Name                       | File                             | resourceType | action   | category |
| --------------------------------- | -------------------------------- | ------------ | -------- | -------- |
| `createOrganization`              | create-organization.ts           | organization | create   | mutation |
| `checkOrganizationSlug`           | create-organization.ts           | organization | check    | read     |
| `deleteOrganization`              | delete-organization.ts           | organization | delete   | mutation |
| `updateOrganization`              | update-organization.ts           | organization | update   | mutation |
| `updateAgentConfig`               | update-agent-config.ts           | settings     | update   | mutation |
| `updateAgentSettings`             | update-agent-settings.ts         | settings     | update   | mutation |
| `getAgentMetrics`                 | get-agent-metrics.ts             | settings     | get      | read     |
| `exportAgentMetrics`              | export-agent-metrics.ts          | export       | export   | mutation |
| `exportAgentAnalytics`            | export-agent-analytics.ts        | export       | export   | mutation |
| `exportAuditLogs`                 | export-audit-logs.ts             | audit_log    | export   | mutation |
| `getAdminUsers`                   | get-admin-users.ts               | user         | list     | read     |
| `invalidateEmbeddingCache`        | invalidate-embedding-cache.ts    | settings     | update   | mutation |
| `invalidateEmbeddingCacheByModel` | invalidate-embedding-cache.ts    | settings     | update   | mutation |
| `getEmbeddingCacheStats`          | invalidate-embedding-cache.ts    | settings     | get      | read     |
| `inviteMemberToOrganization`      | invite-member-to-organization.ts | invitation   | invite   | mutation |
| `assignMemberToTeams`             | invite-member-to-organization.ts | team         | assign   | mutation |
| `inviteMember`                    | member-management.ts             | invitation   | invite   | mutation |
| `removeMember`                    | member-management.ts             | organization | delete   | mutation |
| `updateMemberRole`                | member-management.ts             | role         | update   | mutation |
| `createTeam`                      | teams.ts                         | team         | create   | mutation |
| `updateTeam`                      | teams.ts                         | team         | update   | mutation |
| `deleteTeam`                      | teams.ts                         | team         | delete   | mutation |
| `assignUserToTeam`                | teams.ts                         | team         | assign   | mutation |
| `removeUserFromTeam`              | teams.ts                         | team         | unassign | mutation |
| `updateUserTeamRole`              | teams.ts                         | role         | update   | mutation |

#### Bot (8 actions)

| Export Name                    | File                        | resourceType     | action      | category |
| ------------------------------ | --------------------------- | ---------------- | ----------- | -------- |
| `startBotSessionAction`        | start-bot-session.ts        | bot_session      | start       | mutation |
| `cancelBotSession`             | cancel-bot-session.ts       | bot_session      | cancel      | mutation |
| `retryBotSession`              | retry-bot-session.ts        | bot_session      | retry       | mutation |
| `getBotSessionDetails`         | get-bot-session-details.ts  | bot_session      | get         | read     |
| `getSeriesSubscriptionsAction` | get-series-subscriptions.ts | bot_subscription | list        | read     |
| `subscribeToSeriesAction`      | subscribe-to-series.ts      | bot_subscription | subscribe   | mutation |
| `unsubscribeFromSeriesAction`  | unsubscribe-from-series.ts  | bot_subscription | unsubscribe | mutation |
| `updateBotSettings`            | update-bot-settings.ts      | bot_settings     | update      | mutation |

#### Chat (8 actions)

| Export Name                     | File                    | resourceType | action  | category |
| ------------------------------- | ----------------------- | ------------ | ------- | -------- |
| `listConversationsAction`       | conversation-history.ts | chat         | list    | read     |
| `searchConversationsAction`     | conversation-history.ts | chat         | search  | read     |
| `softDeleteConversationAction`  | conversation-history.ts | chat         | delete  | mutation |
| `restoreConversationAction`     | conversation-history.ts | chat         | restore | mutation |
| `archiveConversationAction`     | conversation-history.ts | chat         | archive | mutation |
| `unarchiveConversationAction`   | conversation-history.ts | chat         | restore | mutation |
| `getConversationStatsAction`    | conversation-history.ts | chat         | get     | read     |
| `getConversationMessagesAction` | conversation-history.ts | chat         | read    | read     |

#### Integrations (8 actions)

| Export Name                    | File                           | resourceType | action     | category |
| ------------------------------ | ------------------------------ | ------------ | ---------- | -------- |
| `startDriveWatchAction`        | google/drive-watch.ts          | drive_watch  | create     | mutation |
| `stopDriveWatchAction`         | google/drive-watch.ts          | drive_watch  | cancel     | mutation |
| `listDriveWatchesAction`       | google/drive-watch.ts          | drive_watch  | list       | read     |
| `updateDriveWatchAction`       | google/drive-watch.ts          | drive_watch  | update     | mutation |
| `deleteDriveWatchAction`       | google/drive-watch.ts          | drive_watch  | delete     | mutation |
| `getMicrosoftAuthUrl`          | microsoft/connect.ts           | integration  | connect    | mutation |
| `getMicrosoftConnectionStatus` | microsoft/connection-status.ts | integration  | get        | read     |
| `disconnectMicrosoftAccount`   | microsoft/disconnect.ts        | integration  | disconnect | mutation |

#### Knowledge Base (7 actions)

| Export Name                           | File                  | resourceType            | action | category |
| ------------------------------------- | --------------------- | ----------------------- | ------ | -------- |
| `createKnowledgeEntryAction`          | create-entry.ts       | knowledge_base          | create | mutation |
| `updateKnowledgeEntryAction`          | update-entry.ts       | knowledge_base          | update | mutation |
| `deleteKnowledgeEntryAction`          | delete-entry.ts       | knowledge_base          | delete | mutation |
| `deleteKnowledgeDocumentAction`       | delete-document.ts    | knowledge_base_document | delete | mutation |
| `getKnowledgeEntriesByIdsAction`      | get-entries-by-ids.ts | knowledge_base          | read   | read     |
| `uploadKnowledgeDocumentAction`       | upload-document.ts    | knowledge_base_document | upload | mutation |
| `uploadKnowledgeDocumentsBatchAction` | upload-document.ts    | knowledge_base_document | upload | mutation |

#### Meetings (20 actions)

| Export Name                     | File                              | resourceType    | action   | category |
| ------------------------------- | --------------------------------- | --------------- | -------- | -------- |
| `getMeetings`                   | get-meetings.ts                   | meeting         | list     | read     |
| `getBotSessions`                | get-bot-sessions.ts               | bot_session     | list     | read     |
| `addBotToMeeting`               | add-bot-to-meeting.ts             | bot_session     | create   | mutation |
| `removeBotFromMeeting`          | remove-bot-from-meeting.ts        | bot_session     | delete   | mutation |
| `addNotetakerByUrl`             | add-notetaker-by-url.ts           | bot_session     | create   | mutation |
| `updateBotSessionMeetingUrl`    | update-bot-session-meeting-url.ts | bot_session     | update   | mutation |
| `updateBotSessionProject`       | update-bot-session-project.ts     | bot_session     | update   | mutation |
| `updateMeetingDetails`          | update-meeting-details.ts         | meeting         | update   | mutation |
| `createCalendarEventWithBot`    | create-calendar-event-with-bot.ts | meeting         | create   | mutation |
| `getCalendars`                  | get-calendars.ts                  | calendar        | list     | read     |
| `getConnectedCalendarProviders` | get-connected-providers.ts        | integration     | list     | read     |
| `generateAgendaFromAI`          | generate-agenda.ts                | agenda          | generate | mutation |
| `getOrCreateMeeting`            | meeting-actions.ts                | meeting         | create   | mutation |
| `updateMeeting`                 | meeting-actions.ts                | meeting         | update   | mutation |
| `saveMeetingNotes`              | meeting-actions.ts                | meeting         | update   | mutation |
| `configurePostActions`          | meeting-actions.ts                | meeting         | update   | mutation |
| `addAgendaItem`                 | agenda-actions.ts                 | agenda          | create   | mutation |
| `updateAgendaItem`              | agenda-actions.ts                 | agenda          | update   | mutation |
| `deleteAgendaItem`              | agenda-actions.ts                 | agenda          | delete   | mutation |
| `applyAgendaTemplate`           | agenda-actions.ts                 | agenda_template | apply    | mutation |

#### Notifications (4 actions — all plain async, must migrate\*)

| Export Name                  | File                      | resourceType | action    | category |
| ---------------------------- | ------------------------- | ------------ | --------- | -------- |
| `getNotifications`\*         | get-notifications.ts      | notification | list      | read     |
| `getUnreadCount`\*           | get-unread-count.ts       | notification | get       | read     |
| `markNotificationRead`\*     | mark-notification-read.ts | notification | mark_read | mutation |
| `markAllNotificationsRead`\* | mark-all-read.ts          | notification | mark_read | mutation |

#### Onboarding (4 actions)

| Export Name                    | File                 | resourceType | action   | category |
| ------------------------------ | -------------------- | ------------ | -------- | -------- |
| `completeOnboardingAction`     | onboarding.ts        | onboarding   | complete | mutation |
| `createOnboardingRecordAction` | onboarding.ts        | onboarding   | create   | mutation |
| `updateOnboardingDataAction`   | onboarding.ts        | onboarding   | update   | mutation |
| `inviteColleaguesAction`       | invite-colleagues.ts | invitation   | invite   | mutation |

#### Projects (10 actions)

| Export Name                   | File                       | resourceType     | action  | category |
| ----------------------------- | -------------------------- | ---------------- | ------- | -------- |
| `createProjectAction`         | create-project.ts          | project          | create  | mutation |
| `createProjectFormAction`\*   | create-project.ts          | project          | create  | mutation |
| `updateProjectAction`         | update-project.ts          | project          | update  | mutation |
| `deleteProjectAction`         | delete-project.ts          | project          | delete  | mutation |
| `archiveProjectAction`        | archive-project.ts         | project          | archive | mutation |
| `unarchiveProjectAction`      | unarchive-project.ts       | project          | restore | mutation |
| `getUserProjects`\*           | get-user-projects.ts       | project          | list    | read     |
| `createProjectTemplateAction` | create-project-template.ts | project_template | create  | mutation |
| `updateProjectTemplateAction` | update-project-template.ts | project_template | update  | mutation |
| `deleteProjectTemplateAction` | delete-project-template.ts | project_template | delete  | mutation |

#### Recordings (31 actions)

| Export Name                      | File                             | resourceType | action    | category |
| -------------------------------- | -------------------------------- | ------------ | --------- | -------- |
| `uploadRecordingFormAction`\*    | upload-recording.ts              | recording    | upload    | mutation |
| `getRecordingStatusAction`       | get-recording-status.ts          | recording    | get       | read     |
| `updateRecordingAction`          | edit-recording.ts                | recording    | update    | mutation |
| `deleteRecordingAction`          | delete-recording.ts              | recording    | delete    | mutation |
| `archiveRecordingAction`         | archive-recording.ts             | recording    | archive   | mutation |
| `unarchiveRecordingAction`       | unarchive-recording.ts           | recording    | restore   | mutation |
| `updateRecordingMetadataAction`  | update-recording-metadata.ts     | recording    | update    | mutation |
| `updateTranscription`            | update-transcription.ts          | recording    | update    | mutation |
| `restoreTranscriptionVersion`    | restore-transcription-version.ts | recording    | restore   | mutation |
| `getTranscriptionHistory`        | get-transcription-history.ts     | recording    | read      | read     |
| `updateSummary`                  | update-summary.ts                | recording    | update    | mutation |
| `getSummaryHistory`              | get-summary-history.ts           | recording    | read      | read     |
| `updateUserNotes`                | update-user-notes.ts             | recording    | update    | mutation |
| `detectPIIAction`                | redact-pii.ts                    | redaction    | detect    | read     |
| `createRedactionAction`          | redact-pii.ts                    | redaction    | create    | mutation |
| `createBulkRedactionsAction`     | redact-pii.ts                    | redaction    | create    | mutation |
| `getRedactionsAction`            | redact-pii.ts                    | redaction    | list      | read     |
| `deleteRedactionAction`          | redact-pii.ts                    | redaction    | delete    | mutation |
| `applyAutomaticRedactionsAction` | redact-pii.ts                    | redaction    | apply     | mutation |
| `reprocessRecordingAction`       | reprocess-recording.ts           | recording    | reprocess | mutation |
| `getReprocessingStatusAction`    | reprocess-recording.ts           | recording    | get       | read     |
| `grantConsentAction`             | manage-consent.ts                | consent      | grant     | mutation |
| `revokeConsentAction`            | manage-consent.ts                | consent      | revoke    | mutation |
| `bulkGrantConsentAction`         | manage-consent.ts                | consent      | grant     | mutation |
| `moveRecordingAction`            | move-recording.ts                | recording    | move      | mutation |
| `updateSpeakerNames`             | update-speaker-names.ts          | recording    | update    | mutation |
| `updateUtteranceSpeaker`         | update-utterance-speaker.ts      | recording    | update    | mutation |
| `getDeepgramTokenAction`         | deepgram-token.ts                | recording    | get       | read     |
| `createGmailDraft`               | create-gmail-draft.ts            | export       | create    | mutation |
| `requestUploadSasAction`         | request-upload-sas.ts            | recording    | get       | read     |

#### Settings (30 actions)

| Export Name                            | File                         | resourceType    | action     | category |
| -------------------------------------- | ---------------------------- | --------------- | ---------- | -------- |
| `updateProfile`                        | update-profile.ts            | user            | update     | mutation |
| `getGoogleConnectionStatus`            | google-connection.ts         | integration     | get        | read     |
| `disconnectGoogleAccount`              | google-connection.ts         | integration     | disconnect | mutation |
| `getGoogleIntegrationStatus`           | google-status.ts             | integration     | get        | read     |
| `retryFailedAction`                    | google-status.ts             | integration     | retry      | mutation |
| `getGoogleSettings`                    | google-settings.ts           | integration     | get        | read     |
| `updateGoogleSettings`                 | google-settings.ts           | integration     | update     | mutation |
| `resetGoogleSettings`                  | google-settings.ts           | integration     | reset      | mutation |
| `getEmailTemplates`                    | google-templates.ts          | integration     | get        | read     |
| `getCalendarTemplates`                 | google-templates.ts          | integration     | get        | read     |
| `saveEmailTemplate`                    | google-templates.ts          | integration     | update     | mutation |
| `saveCalendarTemplate`                 | google-templates.ts          | integration     | update     | mutation |
| `deleteTemplate`                       | google-templates.ts          | integration     | delete     | mutation |
| `getMicrosoftIntegrationStatus`        | microsoft-status.ts          | integration     | get        | read     |
| `retryMicrosoftFailedAction`           | microsoft-status.ts          | integration     | retry      | mutation |
| `getMicrosoftSettings`                 | microsoft-settings.ts        | integration     | get        | read     |
| `updateMicrosoftSettings`              | microsoft-settings.ts        | integration     | update     | mutation |
| `resetMicrosoftSettings`               | microsoft-settings.ts        | integration     | reset      | mutation |
| `createOrganizationInstructionsAction` | organization-instructions.ts | organization    | create     | mutation |
| `updateOrganizationInstructionsAction` | organization-instructions.ts | organization    | update     | mutation |
| `getOrganizationSettings`              | organization-settings.ts     | organization    | get        | read     |
| `updateOrganizationSettings`           | organization-settings.ts     | organization    | update     | mutation |
| `submitPrivacyRequestAction`           | privacy-request.ts           | privacy_request | create     | mutation |
| `withdrawPrivacyRequestAction`         | privacy-request.ts           | privacy_request | delete     | mutation |
| `getPrivacyRequestsAction`             | privacy-request.ts           | privacy_request | list       | read     |
| `requestDataExport`                    | export-user-data.ts          | data_export     | export     | mutation |
| `getExportHistory`                     | export-user-data.ts          | data_export     | list       | read     |
| `requestDeletionAction`                | delete-user-data.ts          | user            | delete     | mutation |
| `cancelDeletionAction`                 | delete-user-data.ts          | user            | update     | mutation |
| `getDeletionStatusAction`              | delete-user-data.ts          | user            | get        | read     |

#### Tasks (11 actions)

| Export Name                    | File                        | resourceType | action | category |
| ------------------------------ | --------------------------- | ------------ | ------ | -------- |
| `getUserTasks`\*               | get-user-tasks.ts           | task         | list   | read     |
| `updateTaskStatus`\*           | update-task-status.ts       | task         | update | mutation |
| `updateTaskMetadata`           | update-task-metadata.ts     | task         | update | mutation |
| `getTaskHistory`               | get-task-history.ts         | task         | read   | read     |
| `getOrganizationTags`          | get-organization-tags.ts    | task         | list   | read     |
| `getTaskTags`                  | get-task-tags.ts            | task         | list   | read     |
| `createTag`                    | create-tag.ts               | task         | create | mutation |
| `getOrganizationUsers`         | get-organization-users.ts   | user         | list   | read     |
| `getOrgMembers`                | get-organization-members.ts | user         | list   | read     |
| `createCalendarEvent`          | create-calendar-event.ts    | auto_action  | create | mutation |
| `createCalendarEventsForTasks` | create-calendar-event.ts    | auto_action  | create | mutation |

#### Teams (1 action)

| Export Name           | File               | resourceType | action | category |
| --------------------- | ------------------ | ------------ | ------ | -------- |
| `listUserTeamsAction` | list-user-teams.ts | team         | list   | read     |

#### Root Actions (2 actions)

| Export Name                      | File                   | resourceType | action | category |
| -------------------------------- | ---------------------- | ------------ | ------ | -------- |
| `getDeepgramClientTokenAction`   | actions/deepgram.ts    | recording    | get    | read     |
| `uploadFileToVercelBlobAction`\* | actions/vercel-blob.ts | blob         | upload | mutation |

### 6. Audit Log Page UI Changes

#### 6.1 Category Filter

Add a category filter toggle to the existing `AuditLogFilters` component. Default state: `mutation` selected.

Implementation:

- Add `category` to the URL search params via `nuqs` (consistent with existing filter pattern)
- Default value: `["mutation"]` — shows mutations only on page load
- Options: "Mutations", "Reads", "All"
- Displayed as a segmented control or toggle group above the existing filters

#### 6.2 Filter State

```typescript
// In use-audit-log-filters.ts
const [category, setCategory] = useQueryState("category", {
  defaultValue: "mutation",
  parse: (value) => value as "mutation" | "read" | "all",
});
```

#### 6.3 Data Layer

Add `category` to `AuditLogFilters` interface:

```typescript
export interface AuditLogFilters {
  // ... existing fields ...
  category?: ("mutation" | "read")[];
}
```

Update `findByFilters` and `countByFilters` to filter on the new column.

### 7. Service Layer Changes

#### 7.1 Update `CreateAuditLogParams`

Add `category` field to the service interface:

```typescript
export interface CreateAuditLogParams {
  eventType: string;
  resourceType: string;
  resourceId?: string | null;
  userId: string;
  organizationId: string;
  action: string;
  category: "mutation" | "read"; // NEW
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}
```

#### 7.2 Update Hash Computation

Add `category` to the `computeHash` function input to prevent category tampering:

```typescript
const hashInput = JSON.stringify({
  previousHash: log.previousHash ?? "",
  eventType: log.eventType,
  resourceType: log.resourceType,
  resourceId: log.resourceId ?? "",
  userId: log.userId,
  organizationId: log.organizationId,
  action: log.action,
  category: log.category, // NEW
  createdAt: log.createdAt.toISOString(),
  metadata: log.metadata ?? {},
});
```

### 8. Migration Strategy

**Important:** The enum-to-text conversion for `eventType` and the uuid-to-text conversion for `resourceId` require manual SQL. Drizzle ORM's auto-generation may not handle these cleanly. This migration should be written as a custom SQL migration file, not auto-generated.

```sql
-- 1. Add category enum and column
CREATE TYPE "audit_category" AS ENUM ('mutation', 'read');
ALTER TABLE "audit_logs" ADD COLUMN "category" "audit_category" NOT NULL DEFAULT 'mutation';

-- 2. Convert eventType from enum to text (requires manual SQL — not auto-generated by Drizzle)
ALTER TABLE "audit_logs" ALTER COLUMN "event_type" TYPE text;
DROP TYPE IF EXISTS "audit_event_type";

-- 3. Convert resourceId from uuid to text
ALTER TABLE "audit_logs" ALTER COLUMN "resource_id" TYPE text;

-- 4. Add new values to resource type enum
ALTER TYPE "audit_resource_type" ADD VALUE IF NOT EXISTS 'meeting';
ALTER TYPE "audit_resource_type" ADD VALUE IF NOT EXISTS 'bot_session';
ALTER TYPE "audit_resource_type" ADD VALUE IF NOT EXISTS 'bot_settings';
ALTER TYPE "audit_resource_type" ADD VALUE IF NOT EXISTS 'bot_subscription';
ALTER TYPE "audit_resource_type" ADD VALUE IF NOT EXISTS 'notification';
ALTER TYPE "audit_resource_type" ADD VALUE IF NOT EXISTS 'team';
ALTER TYPE "audit_resource_type" ADD VALUE IF NOT EXISTS 'onboarding';
ALTER TYPE "audit_resource_type" ADD VALUE IF NOT EXISTS 'auto_action';
ALTER TYPE "audit_resource_type" ADD VALUE IF NOT EXISTS 'agenda';
ALTER TYPE "audit_resource_type" ADD VALUE IF NOT EXISTS 'agenda_template';
ALTER TYPE "audit_resource_type" ADD VALUE IF NOT EXISTS 'share_token';
ALTER TYPE "audit_resource_type" ADD VALUE IF NOT EXISTS 'drive_watch';
ALTER TYPE "audit_resource_type" ADD VALUE IF NOT EXISTS 'knowledge_base_document';
ALTER TYPE "audit_resource_type" ADD VALUE IF NOT EXISTS 'project_template';
ALTER TYPE "audit_resource_type" ADD VALUE IF NOT EXISTS 'redaction';
ALTER TYPE "audit_resource_type" ADD VALUE IF NOT EXISTS 'privacy_request';
ALTER TYPE "audit_resource_type" ADD VALUE IF NOT EXISTS 'data_export';
ALTER TYPE "audit_resource_type" ADD VALUE IF NOT EXISTS 'invitation';
ALTER TYPE "audit_resource_type" ADD VALUE IF NOT EXISTS 'calendar';
ALTER TYPE "audit_resource_type" ADD VALUE IF NOT EXISTS 'audit_log';
ALTER TYPE "audit_resource_type" ADD VALUE IF NOT EXISTS 'blob';

-- 5. Add new values to action enum
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'start';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'cancel';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'retry';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'subscribe';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'unsubscribe';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'complete';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'uncomplete';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'move';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'reprocess';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'upload';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'download';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'redact';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'invite';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'accept';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'reject';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'mark_read';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'generate';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'login';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'logout';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'verify';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'reset';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'list';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'get';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'search';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'detect';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'apply';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'check';

-- 6. Add indexes for category filtering
CREATE INDEX IF NOT EXISTS "audit_logs_category_idx" ON "audit_logs" ("category");
CREATE INDEX IF NOT EXISTS "audit_logs_org_category_idx" ON "audit_logs" ("organization_id", "category");
```

**Data migration**: None required. Existing rows default to `category = 'mutation'`, which is correct since all current logs are mutations. Existing `event_type` text values remain valid. Existing `resource_id` UUID values remain valid as text.

### 9. ActionContext Type Update

Extend the existing `ActionContext` interface:

```typescript
export interface ActionContext {
  logger: typeof logger;
  session?: SessionWithRoles;
  user?: BetterAuthUser;
  organizationId?: string;
  userTeamIds?: string[];
  audit: AuditContext; // NEW
}
```

### 10. Hash Chain Considerations

The fire-and-forget pattern creates a concurrency issue: multiple simultaneous actions from the same org will race to fetch the same "latest hash," creating parallel chain forks. With the dramatically increased write volume (every action, including reads), this becomes a real problem.

**Mitigation options (choose during implementation):**

1. **Accept eventual consistency**: The hash chain already has gaps in practice (concurrent requests). Document this as a known limitation and rely on the `createdAt` ordering + hash presence as the integrity signal, not strict chain linearity.
2. **Per-org write queue**: Use a database advisory lock per org to serialize audit writes. Adds ~5ms latency per write but guarantees chain integrity.
3. **Switch to individual record hashing**: Hash each record independently (without `previousHash`), and verify integrity by checking that no record's hash has been tampered with. Loses chain ordering guarantee but eliminates the concurrency issue entirely.

**Recommendation:** Option 3 (individual record hashing) is the most pragmatic. Chain integrity was aspirational but impractical under concurrent writes. Individual record hashing still detects tampering of any single record.

### 11. Performance Considerations

- **Fire-and-forget**: Audit logging is non-blocking (`void` promise). Action responses are never delayed by audit writes.
- **Read volume estimate**: With 1000 active users, ~50 reads/session, 3 sessions/day = ~150,000 read audit writes/day. With mutation-only default, most users never see these. Storage grows by ~50MB/day at this scale — acceptable for a compliance-focused product.
- **Index strategy**: The composite `(organization_id, category)` index ensures filtered queries remain fast even at scale.

### 12. Testing Strategy

- **Unit tests**: Test `AuditContextImpl` enrichment, middleware audit metadata extraction, and `eventType` generation
- **Integration tests**: Verify audit log creation for representative actions (one mutation, one read, one with enrichment, one fallback)
- **Migration test**: Verify existing data survives migration with correct `category` default and `resourceId` type change
- **Plain function migration tests**: Verify migrated plain async functions still work correctly after conversion to `authorizedActionClient`

## Files Changed

### New Files

- `src/lib/server-action-client/audit-context.ts` — `AuditContext` interface and `AuditContextImpl` class
- `src/lib/server-action-client/audit-middleware.ts` — The audit logging middleware function
- `src/server/db/migrations/XXXX_comprehensive_audit_logging.sql` — DB migration (manual SQL, not auto-generated)

### Modified Files

- `src/server/db/schema/audit-logs.ts` — Add `category` column, expand enums, convert `eventType` to text, convert `resourceId` to text
- `src/lib/server-action-client/action-client.ts` — Add audit middleware to chain, extend metadata schema and `ActionContext`
- `src/server/services/audit-log.service.ts` — Add `category` param to `CreateAuditLogParams`, update `computeHash`
- `src/server/data-access/audit-logs.queries.ts` — Add `category` to filters and queries
- `src/features/admin/components/audit/audit-log-filters.tsx` — Add category filter toggle
- `src/features/admin/components/audit/audit-log-viewer.tsx` — Display category column
- `src/features/admin/hooks/use-audit-log-filters.ts` — Add category to filter state
- `src/app/(main)/admin/audit-logs/page.tsx` — Pass category filter to service
- `src/lib/auth.ts` — Add audit logging to existing `databaseHooks` and `organizationHooks`
- ~102 action files containing ~148 `authorizedActionClient` exports — Add `audit` metadata to `.metadata()` call
- ~9 plain async function action files — Migrate to `authorizedActionClient` (except `uploadRecordingFormAction` and `ensureUserOrganization` which get explicit audit calls)
- 7 action files — Remove manual `AuditLogService.createAuditLog()` calls, add `ctx.audit` enrichment
