# Comprehensive Audit Logging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-log every server action invocation with mutation/read categorization, replacing manual audit calls with middleware-driven logging.

**Architecture:** Add audit middleware to the `authorizedActionClient` chain that reads `audit` metadata from each action and fires-and-forgets a log entry via `AuditLogService`. Plain async actions get migrated to action clients. Auth events use Better Auth hooks. The audit log admin UI gains a category filter defaulting to "mutations only".

**Tech Stack:** Drizzle ORM (Postgres), next-safe-action middleware, Better Auth hooks, Shadcn UI, nuqs URL state

**Spec:** `docs/superpowers/specs/2026-03-21-comprehensive-audit-logging-design.md`

---

## File Map

### New Files

| File                                                            | Responsibility                                                           |
| --------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `src/lib/server-action-client/audit-context.ts`                 | `AuditContext` interface + `AuditContextImpl` class                      |
| `src/lib/server-action-client/audit-middleware.ts`              | `auditLoggingMiddleware` function for the action client chain            |
| `src/server/db/migrations/0067_comprehensive_audit_logging.sql` | Manual SQL migration: category column, enum expansions, type conversions |

### Modified Files — Foundation

| File                                            | Changes                                                                                                                                                      |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/server/db/schema/audit-logs.ts`            | Add `auditCategoryEnum`, `category` column; convert `eventType` to text, `resourceId` to text; expand resource/action enums                                  |
| `src/lib/server-action-client/action-client.ts` | Extend `schemaMetadata` with `audit` field; extend `ActionContext` with `audit: AuditContext`; add `auditLoggingMiddleware` to chain                         |
| `src/server/services/audit-log.service.ts`      | Add `category` to `CreateAuditLogParams`; update `computeHash` to include `category`; switch to individual record hashing (remove `previousHash` dependency) |
| `src/server/data-access/audit-logs.queries.ts`  | Add `category` to `AuditLogFilters` and filter queries                                                                                                       |

### Modified Files — UI

| File                                                        | Changes                                                                     |
| ----------------------------------------------------------- | --------------------------------------------------------------------------- |
| `src/features/admin/hooks/use-audit-log-filters.ts`         | Add `category` to state, default `"mutation"`                               |
| `src/features/admin/components/audit/audit-log-filters.tsx` | Add category toggle (Mutations / Reads / All)                               |
| `src/features/admin/components/audit/audit-log-viewer.tsx`  | Add `category` to URL params, pass to filters; add Category column to table |
| `src/app/(main)/admin/audit-logs/page.tsx`                  | Parse `category` search param, pass to service                              |

### Modified Files — Auth Hooks

| File              | Changes                                                                   |
| ----------------- | ------------------------------------------------------------------------- |
| `src/lib/auth.ts` | Add audit logging inside existing `databaseHooks` and `organizationHooks` |

### Modified Files — Action Annotations (~102 action files)

Every `authorizedActionClient` action file gets an `audit: { resourceType, action, category }` added to its `.metadata()` call. See individual tasks below for exact mappings.

### Modified Files — Manual Audit Call Migration (7 files)

Remove direct `AuditLogService.createAuditLog()` calls, replace with `ctx.audit.setResourceId/setMetadata` enrichment.

### Modified Files — Plain Async Migrations (~9 files)

Convert plain `async function` server actions to `authorizedActionClient` pattern, except `ensureUserOrganization` and `uploadRecordingFormAction` which get explicit audit calls instead.

---

## Phase 1: Foundation

> **Warning:** The local database will be out of sync with the schema until the migration is applied via CI. Audit log writes will fail locally between Tasks 2-3 and migration deployment. Run all of Phase 1 as a batch before local testing.

> **Parallelism note:** Phases 3, 4, and 5 are independent of each other — they all depend only on Phase 1 being complete. They can be executed in parallel by multiple engineers or subagents.

### Task 1: Database Migration

**Files:**

- Create: `src/server/db/migrations/0067_comprehensive_audit_logging.sql`

- [ ] **Step 1: Write the migration SQL file**

Write the complete manual SQL migration file. See spec Section 8 for the full SQL. Key operations:

- Create `audit_category` enum (`mutation`, `read`)
- Add `category` column with `DEFAULT 'mutation'`
- Convert `event_type` column from enum to text
- Drop `audit_event_type` enum
- Convert `resource_id` from uuid to text
- Add new values to `audit_resource_type` enum (meeting, bot_session, bot_settings, bot_subscription, notification, team, onboarding, auto_action, agenda, agenda_template, share_token, drive_watch, knowledge_base_document, project_template, redaction, privacy_request, data_export, invitation, calendar, audit_log, blob)
- Add new values to `audit_action` enum (start, cancel, retry, subscribe, unsubscribe, complete, uncomplete, move, reprocess, upload, download, redact, invite, accept, reject, mark_read, generate, login, logout, verify, reset, list, get, search, detect, apply, check)
- Create indexes: `audit_logs_category_idx`, `audit_logs_org_category_idx`

- [ ] **Step 2: Commit**

```bash
git add src/server/db/migrations/0067_comprehensive_audit_logging.sql
git commit -m "feat(audit): add migration for comprehensive audit logging"
```

**Note:** Do NOT run the migration. Per CLAUDE.md, migrations are applied via GitHub Actions.

---

### Task 2: Update Schema Definition

**Files:**

- Modify: `src/server/db/schema/audit-logs.ts`

- [ ] **Step 1: Update the schema file to match the migration**

Changes:

1. Add `auditCategoryEnum = pgEnum("audit_category", ["mutation", "read"])`
2. Replace `auditEventTypeEnum` usage: change `eventType` column from `auditEventTypeEnum("event_type").notNull()` to `text("event_type").notNull()`
3. Remove the `auditEventTypeEnum` definition entirely
4. Change `resourceId` from `uuid("resource_id")` to `text("resource_id")`
5. Add `category: auditCategoryEnum("category").notNull()` to the table
6. Add all new values to `auditResourceTypeEnum` (see spec Section 1.4)
7. Add all new values to `auditActionEnum` (see spec Section 1.5)
8. Update the `AuditLog` and `NewAuditLog` types (they auto-infer from the table, so just verify they update correctly)

- [ ] **Step 2: Run typecheck to verify schema is consistent**

```bash
cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm run typecheck
```

Expect: Type errors in files that reference `AuditLog["eventType"]` type (since it changed from enum to string). Note these — they'll be fixed in Task 3.

- [ ] **Step 3: Commit**

```bash
git add src/server/db/schema/audit-logs.ts
git commit -m "feat(audit): update schema with category, text eventType, expanded enums"
```

---

### Task 3: Update Service & Data Access Layer

**Files:**

- Modify: `src/server/services/audit-log.service.ts`
- Modify: `src/server/data-access/audit-logs.queries.ts`

- [ ] **Step 1: Update `CreateAuditLogParams` in audit-log.service.ts**

Add `category: "mutation" | "read"` to the interface. Update `createAuditLog` to pass `category` through to the insert.

- [ ] **Step 2: Update `computeHash` to include `category`**

Add `category: log.category` to the `hashInput` JSON. See spec Section 7.2.

- [ ] **Step 3: Switch to individual record hashing**

Per spec Section 10, remove the `previousHash` dependency from the hash computation:

- In `createAuditLog`: remove the `getLatestLog()` call for `previousHash`
- Set `previousHash` to `null` for all new entries
- Keep the `hash` computation using the rest of the fields
- This eliminates the concurrency issue with fire-and-forget
- **Important:** Update the `computeHash` function's `Pick` type signature — remove `previousHash` from the required fields (or make it optional). Remove `previousHash` from the `hashInput` JSON.
- **Important:** Update the `logEntry` construction (line ~87) to include `category: params.category`

- [ ] **Step 4: Update `verifyHashChain` for individual record hashing**

The existing `verifyHashChain` methods walk the `previousHash` chain (in both `AuditLogsQueries` and `AuditLogService`). Since we're switching to individual record hashing:

- Update `AuditLogsQueries.verifyHashChain()` to recompute each record's hash independently and compare against stored `hash`
- Update `AuditLogService.verifyHashChain()` accordingly
- The method should no longer check `previousHash` linkage, only that each record's `hash` matches a recomputation from its own fields

- [ ] **Step 5: Fix any type references to `AuditLog["eventType"]`**

The `AuditEventType` type alias in `audit-logs.queries.ts` (line 9) references `AuditLog["eventType"]` which is now `string` instead of the enum. Update `AuditLogFilters.eventType` to `string[]` if needed. Also verify `findByEventType` method signature still compiles.

- [ ] **Step 6: Add `category` to `AuditLogFilters` and filter queries**

In `audit-logs.queries.ts`:

1. Add `category?: ("mutation" | "read")[]` to `AuditLogFilters`
2. In `findByFilters`: add condition `if (filters?.category && filters.category.length > 0) conditions.push(inArray(auditLogs.category, filters.category))`
3. In `countByFilters`: add the same condition

- [ ] **Step 7: Run typecheck**

```bash
cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm run typecheck
```

Expect: May still have errors in action files that call `AuditLogService.createAuditLog()` without `category`. These will be resolved in Task 6.

- [ ] **Step 8: Commit**

```bash
git add src/server/services/audit-log.service.ts src/server/data-access/audit-logs.queries.ts
git commit -m "feat(audit): update service with category param, individual record hashing"
```

---

### Task 4: Create Audit Context

**Files:**

- Create: `src/lib/server-action-client/audit-context.ts`

- [ ] **Step 1: Write the AuditContext interface and AuditContextImpl class**

```typescript
export interface AuditContext {
  setResourceId(id: string): void;
  setMetadata(metadata: Record<string, unknown>): void;
}

export class AuditContextImpl implements AuditContext {
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

- [ ] **Step 2: Commit**

```bash
git add src/lib/server-action-client/audit-context.ts
git commit -m "feat(audit): add AuditContext interface and implementation"
```

---

### Task 5: Create Audit Middleware & Integrate into Action Client

**Files:**

- Create: `src/lib/server-action-client/audit-middleware.ts`
- Modify: `src/lib/server-action-client/action-client.ts`

- [ ] **Step 1: Write the audit middleware**

Create `audit-middleware.ts` with the `auditLoggingMiddleware` function. See spec Section 2.3 for the full pseudocode.

The middleware function signature must match `next-safe-action` pattern:

```typescript
export async function auditLoggingMiddleware({
  next,
  ctx,
  metadata,
}: {
  metadata: Metadata;
  next: <NC extends object>(opts: {
    ctx: NC;
  }) => Promise<MiddlewareResult<string, NC>>;
  ctx: ActionContext;
}) {
  // ... implementation
}
```

Key points:

- Import `headers` from `next/headers` for IP/user-agent extraction
- Import `AuditLogService` for logging
- Import `AuditContextImpl` from `./audit-context`
- Read audit config from `metadata.audit` (may be undefined)
- Use `void` (fire-and-forget) for the audit log creation
- Handle both annotated actions (with `audit` metadata) and unannotated fallback
- Log both success and failure cases
- **Edge case:** When `skipAuth: true`, `ctx.user` and `ctx.organizationId` will be `undefined`. The middleware must guard with `if (ctx.user && ctx.organizationId)` before logging (the spec pseudocode already handles this).

- [ ] **Step 2: Extend the metadata schema in `action-client.ts`**

Add `audit` to `schemaMetadata`:

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

- [ ] **Step 3: Extend `ActionContext` interface**

Add `audit: AuditContext` (import from `./audit-context`):

```typescript
export interface ActionContext {
  logger: typeof logger;
  session?: SessionWithRoles;
  user?: BetterAuthUser;
  organizationId?: string;
  userTeamIds?: string[];
  audit: AuditContext;
}
```

- [ ] **Step 4: Add middleware to the `authorizedActionClient` chain**

Add `.use(auditLoggingMiddleware)` after `.use(authenticationMiddleware)`:

```typescript
export const authorizedActionClient = createSafeActionClient({
  handleServerError: handleActionError,
  defineMetadataSchema: () => schemaMetadata,
})
  .use(actionLoggerMiddleware)
  .use(authenticationMiddleware)
  .use(auditLoggingMiddleware); // NEW
```

**Note:** `schemaMetadata` is shared between `authorizedActionClient` and `publicActionClient`. The `audit` field will be available on both, but only `authorizedActionClient` has the audit middleware to read it. Public actions setting `audit` metadata will have it silently ignored — this is by design (auth events are handled via Better Auth hooks instead).

- [ ] **Step 5: Run typecheck**

```bash
cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm run typecheck
```

Expect: Errors in existing action files that access `ctx` but don't have `audit` on it yet (these will be fine since `audit` is always provided by middleware). May also have errors from existing manual `AuditLogService.createAuditLog()` calls missing `category`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/server-action-client/audit-middleware.ts src/lib/server-action-client/action-client.ts
git commit -m "feat(audit): add audit middleware to authorizedActionClient chain"
```

---

## Phase 2: Migrate Existing Manual Calls

### Task 6: Remove Manual Audit Calls, Add ctx.audit Enrichment

**Files:**

- Modify: `src/features/projects/actions/create-project.ts`
- Modify: `src/features/projects/actions/update-project.ts`
- Modify: `src/features/projects/actions/delete-project.ts`
- Modify: `src/features/projects/actions/archive-project.ts`
- Modify: `src/features/recordings/actions/delete-recording.ts`
- Modify: `src/features/recordings/actions/archive-recording.ts`
- Modify: `src/features/admin/actions/export-audit-logs.ts`

For each file:

1. Remove the `AuditLogService.createAuditLog(...)` call
2. Remove the `AuditLogService` import if no longer used
3. Remove any `headers()` call that was only used for `extractRequestInfo`
4. Remove the `logger.audit.event(...)` call if it duplicates the audit log
5. Add `audit` to the `.metadata()` (the correct values are in the catalog, spec Section 5)
6. Add `ctx.audit.setResourceId(...)` where a resource ID is available
7. Add `ctx.audit.setMetadata(...)` where additional context was being passed to the manual call

- [ ] **Step 1: Migrate all 7 files as described above**

- [ ] **Step 2: Run typecheck**

```bash
cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/features/projects/actions/ src/features/recordings/actions/delete-recording.ts src/features/recordings/actions/archive-recording.ts src/features/admin/actions/export-audit-logs.ts
git commit -m "feat(audit): migrate manual audit calls to middleware-driven logging"
```

---

## Phase 3: Annotate All Actions

Each task below adds `audit: { resourceType, action, category }` to the `.metadata()` of every `authorizedActionClient` action in a feature module. The exact values come from the Action Annotation Catalog in spec Section 5.

**Pattern for each action:**

```typescript
// Before
.metadata({
  permissions: policyToPermissions("resource:action"),
  name: "action-name",
})

// After
.metadata({
  permissions: policyToPermissions("resource:action"),
  name: "action-name",
  audit: {
    resourceType: "resource",
    action: "action",
    category: "mutation", // or "read"
  },
})
```

**If the action doesn't have a `name` field yet, add one** using the file name as convention (e.g., `"create-project"`).

---

### Task 7: Annotate Admin Actions (25 exports across 12 files)

**Files:** All files in `src/features/admin/actions/`

- [ ] **Step 1: Add audit metadata to all admin actions**

Refer to the Admin section of the catalog (spec Section 5) for exact values per export. Key files with multiple exports:

- `teams.ts`: 6 exports (createTeam, updateTeam, deleteTeam, assignUserToTeam, removeUserFromTeam, updateUserTeamRole)
- `member-management.ts`: 3 exports (inviteMember, removeMember, updateMemberRole)
- `invite-member-to-organization.ts`: 2 exports (inviteMemberToOrganization, assignMemberToTeams)
- `invalidate-embedding-cache.ts`: 3 exports (invalidateEmbeddingCache, invalidateEmbeddingCacheByModel, getEmbeddingCacheStats)
- `create-organization.ts`: 2 exports (createOrganization, checkOrganizationSlug)

Note: `export-audit-logs.ts` was already migrated in Task 6.

- [ ] **Step 2: Commit**

```bash
git add src/features/admin/actions/
git commit -m "feat(audit): annotate admin action metadata"
```

---

### Task 8: Annotate Bot Actions (8 exports across 8 files)

**Files:** All files in `src/features/bot/actions/`

- [ ] **Step 1: Add audit metadata to all bot actions**

All are single-export files. Refer to Bot section of catalog.

- [ ] **Step 2: Commit**

```bash
git add src/features/bot/actions/
git commit -m "feat(audit): annotate bot action metadata"
```

---

### Task 9: Annotate Chat Actions (8 exports in 1 file)

**Files:** `src/features/chat/actions/conversation-history.ts`

- [ ] **Step 1: Add audit metadata to all 8 exports**

Refer to Chat section of catalog. This is a single file with 8 exports.

- [ ] **Step 2: Commit**

```bash
git add src/features/chat/actions/
git commit -m "feat(audit): annotate chat action metadata"
```

---

### Task 10: Annotate Integration Actions (8 exports across 5 files)

**Files:**

- `src/features/integrations/google/actions/drive-watch.ts` (5 exports)
- `src/features/integrations/microsoft/actions/connect.ts`
- `src/features/integrations/microsoft/actions/connection-status.ts`
- `src/features/integrations/microsoft/actions/disconnect.ts`

- [ ] **Step 1: Add audit metadata**

Refer to Integrations section of catalog.

- [ ] **Step 2: Commit**

```bash
git add src/features/integrations/
git commit -m "feat(audit): annotate integration action metadata"
```

---

### Task 11: Annotate Knowledge Base Actions (7 exports across 6 files)

**Files:** All files in `src/features/knowledge-base/actions/`

- [ ] **Step 1: Add audit metadata**

Note: `upload-document.ts` has 2 exports.

- [ ] **Step 2: Commit**

```bash
git add src/features/knowledge-base/actions/
git commit -m "feat(audit): annotate knowledge base action metadata"
```

---

### Task 12: Annotate Meeting Actions (20 exports across 14 files)

**Files:** All files in `src/features/meetings/actions/`

- [ ] **Step 1: Add audit metadata**

Key multi-export files:

- `meeting-actions.ts`: 4 exports (getOrCreateMeeting, updateMeeting, saveMeetingNotes, configurePostActions)
- `agenda-actions.ts`: 4 exports (addAgendaItem, updateAgendaItem, deleteAgendaItem, applyAgendaTemplate)

- [ ] **Step 2: Commit**

```bash
git add src/features/meetings/actions/
git commit -m "feat(audit): annotate meeting action metadata"
```

---

### Task 13: Annotate Onboarding Actions (4 exports across 2 files)

**Files:** All files in `src/features/onboarding/actions/`

- [ ] **Step 1: Add audit metadata**

`onboarding.ts` has 3 exports.

- [ ] **Step 2: Commit**

```bash
git add src/features/onboarding/actions/
git commit -m "feat(audit): annotate onboarding action metadata"
```

---

### Task 14: Annotate Project Actions (8 authorizedActionClient exports across 9 files)

**Files:** All files in `src/features/projects/actions/` (skip `get-user-projects.ts` which is plain async — handled in Task 19)

- [ ] **Step 1: Add audit metadata**

Note: `create-project.ts` has `createProjectAction` (authorizedActionClient) AND `createProjectFormAction` (plain async). Only annotate `createProjectAction` here. `createProjectFormAction` is migrated in Task 19. The 4 project actions already migrated in Task 6 need their audit metadata verified.

- [ ] **Step 2: Commit**

```bash
git add src/features/projects/actions/
git commit -m "feat(audit): annotate project action metadata"
```

---

### Task 15: Annotate Recording Actions (29 authorizedActionClient exports across ~20 files)

**Files:** All files in `src/features/recordings/actions/` (skip `upload-recording.ts` which is plain async — handled in Task 19)

- [ ] **Step 1: Add audit metadata**

Key multi-export files:

- `redact-pii.ts`: 6 exports
- `reprocess-recording.ts`: 2 exports
- `manage-consent.ts`: 3 exports

Note: `delete-recording.ts` and `archive-recording.ts` were already migrated in Task 6. Verify their audit metadata is correct.

- [ ] **Step 2: Commit**

```bash
git add src/features/recordings/actions/
git commit -m "feat(audit): annotate recording action metadata"
```

---

### Task 16: Annotate Settings Actions (30 exports across ~12 files)

**Files:** All files in `src/features/settings/actions/`

- [ ] **Step 1: Add audit metadata**

Key multi-export files:

- `google-templates.ts`: 5 exports
- `google-settings.ts`: 3 exports
- `microsoft-settings.ts`: 3 exports
- `microsoft-status.ts`: 2 exports
- `privacy-request.ts`: 3 exports
- `delete-user-data.ts`: 3 exports
- `export-user-data.ts`: 2 exports
- `google-connection.ts`: 2 exports
- `google-status.ts`: 2 exports
- `organization-instructions.ts`: 2 exports
- `organization-settings.ts`: 2 exports

- [ ] **Step 2: Commit**

```bash
git add src/features/settings/actions/
git commit -m "feat(audit): annotate settings action metadata"
```

---

### Task 17: Annotate Task & Team Actions (10 authorizedActionClient exports + 1 team)

**Files:**

- All files in `src/features/tasks/actions/` (skip `get-user-tasks.ts` and `update-task-status.ts` — plain async, Task 19)
- `src/features/teams/actions/list-user-teams.ts`

- [ ] **Step 1: Add audit metadata**

`create-calendar-event.ts` has 2 exports.

- [ ] **Step 2: Commit**

```bash
git add src/features/tasks/actions/ src/features/teams/actions/
git commit -m "feat(audit): annotate task and team action metadata"
```

---

### Task 18: Annotate Root Actions (1 authorizedActionClient export)

**Files:**

- `src/actions/deepgram.ts` (skip `vercel-blob.ts` — plain async, Task 19)

- [ ] **Step 1: Add audit metadata**

```typescript
audit: { resourceType: "recording", action: "get", category: "read" }
```

- [ ] **Step 2: Commit**

```bash
git add src/actions/deepgram.ts
git commit -m "feat(audit): annotate root action metadata"
```

---

## Phase 4: Plain Async Function Migrations

### Task 19: Migrate Plain Async Server Actions

**Files to migrate to `authorizedActionClient`:**

- `src/features/notifications/actions/get-notifications.ts`
- `src/features/notifications/actions/get-unread-count.ts`
- `src/features/notifications/actions/mark-notification-read.ts`
- `src/features/notifications/actions/mark-all-read.ts`
- `src/features/tasks/actions/get-user-tasks.ts`
- `src/features/tasks/actions/update-task-status.ts`
- `src/features/projects/actions/get-user-projects.ts`
- `src/features/projects/actions/create-project.ts` (only `createProjectFormAction`)
- `src/actions/vercel-blob.ts`

**Files to keep as plain async but add explicit audit calls:**

- `src/features/auth/actions/ensure-organization.ts`
- `src/features/recordings/actions/upload-recording.ts`

- [ ] **Step 1: Migrate notification actions (4 files)**

For each: replace the plain `async function` pattern with `authorizedActionClient` + `.metadata()` with audit info + `.action()`. These already fetch the session internally — remove that and use `ctx.user`/`ctx.organizationId` from the middleware.

- [ ] **Step 2: Migrate task actions (2 files: get-user-tasks, update-task-status)**

Same pattern as above.

- [ ] **Step 3: Migrate project actions (2: getUserProjects, createProjectFormAction)**

For `createProjectFormAction`: this uses FormData. If it can't work with the action client schema validation, add an explicit `AuditLogService.createAuditLog()` call instead (same as `uploadRecordingFormAction`).

For `getUserProjects`: straightforward migration.

- [ ] **Step 4: Migrate vercel-blob action**

`uploadFileToVercelBlobAction` — convert to `authorizedActionClient`.

- [ ] **Step 5: Add explicit audit calls to exceptions**

For `ensureUserOrganization` and `uploadRecordingFormAction`: add `AuditLogService.createAuditLog()` with `category: "mutation"`. Include the `category` field.

- [ ] **Step 6: Run typecheck**

```bash
cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm run typecheck
```

- [ ] **Step 7: Verify and fix all callers of migrated functions**

Search for all imports of the migrated functions across the codebase. The calling convention changes when migrating from plain async to `authorizedActionClient`:

**Server components / server-side callers:** Previously `const result = await getUserTasks(filters)`. With action client, they need to call the action directly: `const result = await getUserTasks(filters)` — this still works because next-safe-action actions are callable directly.

**Client components using `useAction` hook:** If callers already use `useAction(fn)`, the action client export is compatible. If they call the function directly in an event handler, it still works.

**Key risk:** The return type changes. Plain async functions return the raw data. Action client actions return `{ data?, serverError?, validationErrors? }`. All callers must be updated to handle this new shape.

Run `grep -r` for each migrated function name to find all import sites:

```bash
cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && grep -r "getNotifications\|getUnreadCount\|markNotificationRead\|markAllNotificationsRead\|getUserTasks\|updateTaskStatus\|getUserProjects\|createProjectFormAction\|uploadFileToVercelBlobAction" --include="*.ts" --include="*.tsx" -l src/
```

Fix each caller to handle the new return type.

- [ ] **Step 8: Commit**

```bash
git add src/features/notifications/actions/ src/features/tasks/actions/get-user-tasks.ts src/features/tasks/actions/update-task-status.ts src/features/projects/actions/get-user-projects.ts src/features/projects/actions/create-project.ts src/actions/vercel-blob.ts src/features/auth/actions/ensure-organization.ts src/features/recordings/actions/upload-recording.ts
git commit -m "feat(audit): migrate plain async actions to authorizedActionClient"
```

---

## Phase 5: Auth Hooks

### Task 20: Add Audit Logging to Better Auth Hooks

**Files:**

- Modify: `src/lib/auth.ts`

- [ ] **Step 1: Add `AuditLogService` import**

```typescript
import { AuditLogService } from "@/server/services/audit-log.service";
```

- [ ] **Step 2: Add `session.create.after` hook for login audit**

Inside the existing `databaseHooks.session.create` object, add an `after` handler that logs `user_login`. See spec Section 3 for the exact code. The session object should have `userId`, `ipAddress`, `userAgent`, and `activeOrganizationId`.

- [ ] **Step 3: Add audit logging to existing `user.create.after` hook**

The hook already exists (calls `ensureUserHasOrganization`). Add a `void AuditLogService.createAuditLog(...)` call after the existing logic. See spec Section 3.

- [ ] **Step 4: Add audit logging to existing `organizationHooks`**

Add `void AuditLogService.createAuditLog(...)` calls inside the existing:

- `afterCreateTeam` — log `team_create`
- `afterAcceptInvitation` — log `invitation_accept`
- `afterRejectInvitation` — log `invitation_reject`
- `afterCancelInvitation` — log `invitation_cancel`

**Important:** Don't replace the existing logic in these hooks. Append the audit log call at the end, after the existing business logic.

- [ ] **Step 5: Run typecheck**

```bash
cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm run typecheck
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth.ts
git commit -m "feat(audit): add audit logging to Better Auth hooks"
```

---

## Phase 6: UI Changes

### Task 21: Add Category Filter to Audit Log Page

**Files:**

- Modify: `src/features/admin/hooks/use-audit-log-filters.ts`
- Modify: `src/features/admin/components/audit/audit-log-filters.tsx`
- Modify: `src/features/admin/components/audit/audit-log-viewer.tsx`
- Modify: `src/app/(main)/admin/audit-logs/page.tsx`

- [ ] **Step 1: Add category to the filter hook**

In `use-audit-log-filters.ts`:

1. Add `category: string` to `AuditLogFiltersState` (default: `"mutation"`)
2. Add `SET_CATEGORY` action type
3. Add `setCategory` callback
4. Initialize from `initialFilters?.category ?? "mutation"`

- [ ] **Step 2: Add category toggle to the filter component**

In `audit-log-filters.tsx`:

1. Add `category` and `onCategoryChange` props
2. Add a segmented control / toggle group with 3 options: "Mutations" (`mutation`), "Reads" (`read`), "All" (`all`)
3. Place it above the existing filters as a prominent control
4. Update `RESOURCE_TYPE_OPTIONS` and `ACTION_OPTIONS` to include all new enum values

- [ ] **Step 3: Wire category into the viewer**

In `audit-log-viewer.tsx`:

1. Add `category` to the `useAuditLogFilters` hook state (the hook returns `filters.category`)
2. Add `category` to the URL params in the existing `updateURL()` function (line ~55-75 in the file, which builds `URLSearchParams`)
3. Pass `category` and `onCategoryChange` to `AuditLogFilters` component
4. Add a "Category" column to the table between "Action" and "User ID"

**Note:** The spec suggests using `nuqs` for category state, but the existing implementation uses `useReducer` + manual URL construction. Follow the existing pattern (add to reducer) for consistency.

- [ ] **Step 4: Parse category in the page server component**

In `page.tsx`:

1. Parse `category` from `searchParams`
2. Pass it to `AuditLogService.getAuditLogs()` as a filter
3. Default to `["mutation"]` if not specified

- [ ] **Step 5: Run typecheck**

```bash
cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm run typecheck
```

- [ ] **Step 6: Commit**

```bash
git add src/features/admin/hooks/use-audit-log-filters.ts src/features/admin/components/audit/ src/app/(main)/admin/audit-logs/page.tsx
git commit -m "feat(audit): add category filter to audit log page"
```

---

## Phase 7: Verification

### Task 22: Full Build Verification

- [ ] **Step 1: Run typecheck**

```bash
cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm run typecheck
```

Expected: Clean pass (0 errors).

- [ ] **Step 2: Run linter**

```bash
cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm lint
```

Expected: Should not increase warning count beyond the existing ~99 warnings.

- [ ] **Step 3: Run build**

```bash
cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm run build
```

Expected: Successful build.

- [ ] **Step 4: Fix any errors found in steps 1-3 and re-run**

- [ ] **Step 5: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix(audit): resolve build/lint issues"
```

---

## Deferred: Testing

The spec (Section 12) defines a testing strategy including unit tests for `AuditContextImpl`, integration tests for audit log creation, migration tests, and plain function migration tests. These are deferred to a follow-up task after the core implementation is verified via typecheck/lint/build.
