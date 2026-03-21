# Comprehensive Audit Logging

**Date:** 2026-03-21
**Status:** Draft
**Author:** Claude + Nigel

## Problem

Out of ~113 server actions, only ~9 create audit log entries. The existing audit log infrastructure (schema, service, hash chain, admin UI) is solid, but coverage is sparse. Government clients require full audit trails for every action — both mutations and reads — across all entities.

## Goals

1. Every server action invocation produces an audit log entry automatically
2. Distinguish between `mutation` and `read` categories, defaulting the UI to show mutations only
3. Migrate from a rigid `eventType` enum to a flexible `{resource}_{action}` text convention
4. Expand resource type and action enums to cover all entities
5. Remove existing manual audit log calls; replace with middleware-driven logging + opt-in enrichment
6. Wire Better Auth hooks for auth lifecycle events (login, logout, sign-up, etc.)

## Non-Goals

- Auditing raw API route hits (only server actions and auth events)
- Real-time audit log streaming or alerting
- Changes to consent audit log or chat audit log tables (they remain separate)

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

The current `auditEventTypeEnum` has 36 values, many unused. Replace with a `text` column using the convention `{resourceType}_{action}` (e.g., `meeting_created`, `recording_read`, `task_updated`).

This eliminates the need for a DB migration every time a new entity or action is added.

```typescript
// Before
eventType: auditEventTypeEnum("event_type").notNull(),

// After
eventType: text("event_type").notNull(),
```

Existing rows keep their current values (e.g., `"project_created"`) — they already follow the convention.

#### 1.3 Expand `resourceType` Enum

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
]);
```

#### 1.4 Expand `action` Enum

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

Every action annotates itself:

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

#### 2.3 Audit Logging Middleware

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

  let result;
  let actionSucceeded = true;

  try {
    result = await next({
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
        ipAddress: null, // extracted from headers if available
        userAgent: null,
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
          ipAddress: null,
          userAgent: null,
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

#### 2.4 Request Info Extraction

To capture IP address and user agent, the middleware needs access to request headers. Since `next-safe-action` middleware doesn't receive the request object directly, we use Next.js's `headers()` API:

```typescript
import { headers } from "next/headers";

// Inside auditLoggingMiddleware
const headersList = await headers();
const { ipAddress, userAgent } =
  AuditLogService.extractRequestInfo(headersList);
```

### 3. Auth Event Hooks

Better Auth supports lifecycle hooks. Wire these to create audit log entries for auth events that bypass the server action middleware:

```typescript
// In Better Auth configuration
export const auth = betterAuth({
  // ... existing config ...
  hooks: {
    after: [
      {
        matcher: (context) => context.path.startsWith("/api/auth"),
        handler: async (context) => {
          const pathToAuditEvent: Record<
            string,
            { action: string; eventType: string }
          > = {
            "/api/auth/sign-in/email": {
              action: "login",
              eventType: "user_login",
            },
            "/api/auth/sign-in/social": {
              action: "login",
              eventType: "user_login",
            },
            "/api/auth/sign-up/email": {
              action: "create",
              eventType: "user_created",
            },
            "/api/auth/sign-out": {
              action: "logout",
              eventType: "user_logout",
            },
            "/api/auth/forget-password": {
              action: "reset",
              eventType: "user_password_reset",
            },
            "/api/auth/verify-email": {
              action: "verify",
              eventType: "user_email_verified",
            },
          };

          const event = pathToAuditEvent[context.path];
          if (!event || !context.session?.userId) return;

          void AuditLogService.createAuditLog({
            eventType: event.eventType,
            resourceType: "user",
            resourceId: context.session.userId,
            userId: context.session.userId,
            organizationId: context.session.activeOrganizationId ?? "system",
            action: event.action,
            category: "mutation",
            ipAddress:
              context.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ??
              null,
            userAgent: context.headers?.get("user-agent") ?? null,
            metadata: {
              path: context.path,
              method: context.method,
            },
          });
        },
      },
    ],
  },
});
```

### 4. Migrate Existing Manual Calls

Remove `AuditLogService.createAuditLog()` from these 9 files and replace with `ctx.audit` enrichment:

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

Every server action gets an `audit` metadata annotation. Below is the complete mapping organized by feature:

#### Admin (12 actions)

| Action                        | resourceType | action | category |
| ----------------------------- | ------------ | ------ | -------- |
| create-organization           | organization | create | mutation |
| delete-organization           | organization | delete | mutation |
| update-organization           | organization | update | mutation |
| update-agent-config           | settings     | update | mutation |
| update-agent-settings         | settings     | update | mutation |
| get-agent-metrics             | settings     | read   | read     |
| export-agent-metrics          | export       | export | mutation |
| export-agent-analytics        | export       | export | mutation |
| export-audit-logs             | audit_log    | export | mutation |
| get-admin-users               | user         | list   | read     |
| invalidate-embedding-cache    | settings     | update | mutation |
| invite-member-to-organization | invitation   | invite | mutation |
| member-management             | team         | update | mutation |
| teams                         | team         | read   | read     |

#### Auth (6 actions)

| Action              | resourceType | action | category |
| ------------------- | ------------ | ------ | -------- |
| sign-up             | user         | create | mutation |
| sign-in             | user         | login  | mutation |
| password-reset      | user         | reset  | mutation |
| magic-link          | user         | login  | mutation |
| accept-invitation   | invitation   | accept | mutation |
| ensure-organization | organization | create | mutation |

#### Bot (8 actions)

| Action                   | resourceType     | action      | category |
| ------------------------ | ---------------- | ----------- | -------- |
| start-bot-session        | bot_session      | start       | mutation |
| cancel-bot-session       | bot_session      | cancel      | mutation |
| retry-bot-session        | bot_session      | retry       | mutation |
| get-bot-session-details  | bot_session      | get         | read     |
| get-series-subscriptions | bot_subscription | list        | read     |
| subscribe-to-series      | bot_subscription | subscribe   | mutation |
| unsubscribe-from-series  | bot_subscription | unsubscribe | mutation |
| update-bot-settings      | bot_settings     | update      | mutation |

#### Chat (1 action)

| Action               | resourceType | action | category |
| -------------------- | ------------ | ------ | -------- |
| conversation-history | chat         | read   | read     |

#### Integrations (4 actions)

| Action                      | resourceType | action     | category |
| --------------------------- | ------------ | ---------- | -------- |
| drive-watch                 | drive_watch  | create     | mutation |
| microsoft/connect           | integration  | connect    | mutation |
| microsoft/connection-status | integration  | get        | read     |
| microsoft/disconnect        | integration  | disconnect | mutation |

#### Knowledge Base (6 actions)

| Action             | resourceType            | action | category |
| ------------------ | ----------------------- | ------ | -------- |
| create-entry       | knowledge_base          | create | mutation |
| update-entry       | knowledge_base          | update | mutation |
| delete-entry       | knowledge_base          | delete | mutation |
| delete-document    | knowledge_base_document | delete | mutation |
| get-entries-by-ids | knowledge_base          | read   | read     |
| upload-document    | knowledge_base_document | upload | mutation |

#### Meetings (13 actions)

| Action                          | resourceType | action   | category |
| ------------------------------- | ------------ | -------- | -------- |
| get-meetings                    | meeting      | list     | read     |
| get-bot-sessions                | bot_session  | list     | read     |
| add-bot-to-meeting              | bot_session  | create   | mutation |
| remove-bot-from-meeting         | bot_session  | delete   | mutation |
| add-notetaker-by-url            | bot_session  | create   | mutation |
| update-bot-session-meeting-url  | bot_session  | update   | mutation |
| update-bot-session-project      | bot_session  | update   | mutation |
| update-meeting-details          | meeting      | update   | mutation |
| create-calendar-event-with-bot  | meeting      | create   | mutation |
| get-calendars                   | calendar     | list     | read     |
| get-connected-providers         | integration  | list     | read     |
| generate-agenda                 | agenda       | generate | mutation |
| meeting-actions (get-or-create) | meeting      | create   | mutation |
| meeting-actions (update)        | meeting      | update   | mutation |
| meeting-actions (save-notes)    | meeting      | update   | mutation |
| agenda-actions                  | agenda       | update   | mutation |

#### Notifications (4 actions)

| Action                 | resourceType | action    | category |
| ---------------------- | ------------ | --------- | -------- |
| get-notifications      | notification | list      | read     |
| get-unread-count       | notification | read      | read     |
| mark-notification-read | notification | mark_read | mutation |
| mark-all-read          | notification | mark_read | mutation |

#### Onboarding (2 actions)

| Action            | resourceType | action | category |
| ----------------- | ------------ | ------ | -------- |
| onboarding        | onboarding   | update | mutation |
| invite-colleagues | invitation   | invite | mutation |

#### Projects (8 actions)

| Action                  | resourceType     | action  | category |
| ----------------------- | ---------------- | ------- | -------- |
| create-project          | project          | create  | mutation |
| update-project          | project          | update  | mutation |
| delete-project          | project          | delete  | mutation |
| archive-project         | project          | archive | mutation |
| unarchive-project       | project          | restore | mutation |
| get-user-projects       | project          | list    | read     |
| create-project-template | project_template | create  | mutation |
| update-project-template | project_template | update  | mutation |
| delete-project-template | project_template | delete  | mutation |

#### Recordings (25 actions)

| Action                        | resourceType | action    | category |
| ----------------------------- | ------------ | --------- | -------- |
| get-recording-status          | recording    | get       | read     |
| upload-recording              | recording    | upload    | mutation |
| edit-recording                | recording    | update    | mutation |
| delete-recording              | recording    | delete    | mutation |
| archive-recording             | recording    | archive   | mutation |
| unarchive-recording           | recording    | restore   | mutation |
| update-recording-metadata     | recording    | update    | mutation |
| update-transcription          | recording    | update    | mutation |
| restore-transcription-version | recording    | restore   | mutation |
| get-transcription-history     | recording    | read      | read     |
| update-summary                | recording    | update    | mutation |
| get-summary-history           | recording    | read      | read     |
| update-user-notes             | recording    | update    | mutation |
| redact-pii                    | redaction    | redact    | mutation |
| reprocess-recording           | recording    | reprocess | mutation |
| manage-consent                | consent      | update    | mutation |
| move-recording                | recording    | move      | mutation |
| update-speaker-names          | recording    | update    | mutation |
| update-utterance-speaker      | recording    | update    | mutation |
| deepgram-token                | recording    | get       | read     |
| create-gmail-draft            | export       | create    | mutation |
| request-upload-sas            | recording    | get       | read     |

#### Settings (15 actions)

| Action                    | resourceType    | action  | category |
| ------------------------- | --------------- | ------- | -------- |
| update-profile            | user            | update  | mutation |
| google-connection         | integration     | connect | mutation |
| google-status             | integration     | get     | read     |
| google-settings           | integration     | update  | mutation |
| google-templates          | integration     | update  | mutation |
| microsoft-status          | integration     | get     | read     |
| microsoft-settings        | integration     | update  | mutation |
| organization-instructions | organization    | update  | mutation |
| organization-settings     | organization    | update  | mutation |
| privacy-request           | privacy_request | create  | mutation |
| export-user-data          | data_export     | export  | mutation |
| delete-user-data          | user            | delete  | mutation |

#### Tasks (9 actions)

| Action                   | resourceType | action | category |
| ------------------------ | ------------ | ------ | -------- |
| get-user-tasks           | task         | list   | read     |
| update-task-status       | task         | update | mutation |
| update-task-metadata     | task         | update | mutation |
| get-task-history         | task         | read   | read     |
| get-organization-tags    | task         | list   | read     |
| get-task-tags            | task         | list   | read     |
| create-tag               | task         | create | mutation |
| get-organization-users   | user         | list   | read     |
| get-organization-members | user         | list   | read     |
| create-calendar-event    | auto_action  | create | mutation |

#### Teams (1 action)

| Action          | resourceType | action | category |
| --------------- | ------------ | ------ | -------- |
| list-user-teams | team         | list   | read     |

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

### 7. Migration Strategy

One DB migration covering all schema changes:

```sql
-- 1. Add category enum and column
CREATE TYPE "audit_category" AS ENUM ('mutation', 'read');
ALTER TABLE "audit_logs" ADD COLUMN "category" "audit_category" NOT NULL DEFAULT 'mutation';

-- 2. Convert eventType from enum to text
ALTER TABLE "audit_logs" ALTER COLUMN "event_type" TYPE text;
DROP TYPE IF EXISTS "audit_event_type";

-- 3. Add new values to resource type enum
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

-- 4. Add new values to action enum
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

-- 5. Add index for category filtering
CREATE INDEX IF NOT EXISTS "audit_logs_category_idx" ON "audit_logs" ("category");
CREATE INDEX IF NOT EXISTS "audit_logs_org_category_idx" ON "audit_logs" ("organization_id", "category");
```

**Data migration**: None required. Existing rows default to `category = 'mutation'`, which is correct since all current logs are mutations. Existing `event_type` text values already follow the `{resource}_{action}` convention.

### 8. ActionContext Type Update

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

### 9. Hash Chain Considerations

The existing hash chain mechanism continues to work. The `computeHash` function already hashes `eventType`, `resourceType`, `action`, and `metadata` — all of which are present in the new system. The `category` field should be added to the hash computation to prevent tampering with the category classification.

### 10. Performance Considerations

- **Fire-and-forget**: Audit logging is non-blocking (`void` promise). Action responses are never delayed by audit writes.
- **Read volume**: Full read logging increases write volume significantly. The `category` index and org-scoped queries ensure read performance stays acceptable.
- **Hash chain bottleneck**: The hash chain requires fetching the latest log per org before each insert. At high volume, consider batching or relaxing to per-session chains. For now, the existing approach is sufficient given the action-level (not request-level) granularity.

### 11. Testing Strategy

- **Unit tests**: Test `AuditContextImpl` enrichment, middleware audit metadata extraction, and `eventType` generation
- **Integration tests**: Verify audit log creation for representative actions (one mutation, one read, one with enrichment, one fallback)
- **Migration test**: Verify existing data survives migration with correct `category` default

## Files Changed

### New Files

- `src/lib/server-action-client/audit-context.ts` — `AuditContext` interface and `AuditContextImpl` class
- `src/lib/server-action-client/audit-middleware.ts` — The audit logging middleware function
- `src/server/db/migrations/XXXX_comprehensive_audit_logging.sql` — DB migration

### Modified Files

- `src/server/db/schema/audit-logs.ts` — Add `category` column, expand enums, convert `eventType` to text
- `src/lib/server-action-client/action-client.ts` — Add audit middleware to chain, extend metadata schema and `ActionContext`
- `src/server/services/audit-log.service.ts` — Accept `category` param in `createAuditLog`
- `src/server/data-access/audit-logs.queries.ts` — Add `category` to filters and queries
- `src/features/admin/components/audit/audit-log-filters.tsx` — Add category filter toggle
- `src/features/admin/components/audit/audit-log-viewer.tsx` — Display category column
- `src/features/admin/hooks/use-audit-log-filters.ts` — Add category to filter state
- `src/app/(main)/admin/audit-logs/page.tsx` — Pass category filter to service
- All ~113 server action files — Add `audit` metadata to `.metadata()` call
- 8 server action files — Remove manual `AuditLogService.createAuditLog()` calls, add `ctx.audit` enrichment
- Better Auth configuration file — Add auth lifecycle hooks
