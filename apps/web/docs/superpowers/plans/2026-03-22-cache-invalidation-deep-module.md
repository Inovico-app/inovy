# Cache Invalidation Deep Module — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the new cache invalidation module alongside the existing system — CACHE_POLICIES registry, middleware, `invalidateFor()`, `tagsFor()`, and tests — without removing any existing `CacheInvalidation.*` calls.

**Architecture:** A `cacheInvalidationMiddleware` is appended to the `authorizedActionClient` chain. It auto-resolves cache policies from audit metadata already present on action files. A `CACHE_POLICIES` registry maps `"resourceType:action"` keys to pure policy functions. `invalidateFor()` provides the same resolution for non-action callers. `tagsFor()` centralizes tag generation for cache wrappers. During Phase 1, both old and new systems run — `invalidateCache()` is idempotent so double-firing is safe.

**Tech Stack:** TypeScript, Next.js 16 (`updateTag`/`revalidateTag`/`cacheTag`), next-safe-action middleware, Vitest

**Spec:** `docs/superpowers/specs/2026-03-22-cache-invalidation-deep-module-design.md`

---

## File Structure

### New files (in order of dependency):

| File                                                            | Responsibility                                            |
| --------------------------------------------------------------- | --------------------------------------------------------- |
| `src/lib/cache/types.ts`                                        | `CachePolicy`, `InvalidationContext`, `CacheEntity` types |
| `src/lib/cache/cache-policies.ts`                               | `CACHE_POLICIES` registry + `buildKnowledgeTags` helper   |
| `src/lib/cache/cache-invalidation-middleware.ts`                | next-safe-action middleware                               |
| `src/lib/cache/invalidate-for.ts`                               | `invalidateFor()` escape hatch                            |
| `src/lib/cache/tags-for.ts`                                     | `tagsFor()` read-side helper                              |
| `src/lib/cache/index.ts`                                        | Barrel exports                                            |
| `src/lib/cache/__tests__/build-knowledge-tags.test.ts`          | Knowledge hierarchy tests                                 |
| `src/lib/cache/__tests__/cache-policies.test.ts`                | Policy unit tests                                         |
| `src/lib/cache/__tests__/cache-invalidation-middleware.test.ts` | Middleware tests                                          |

### Modified files:

| File                                            | Change                                                                           |
| ----------------------------------------------- | -------------------------------------------------------------------------------- |
| `src/lib/server-action-client/action-client.ts` | Add `invalidate` to `schemaMetadata`, append `.use(cacheInvalidationMiddleware)` |

---

## Task 1: Types Module

**Files:**

- Create: `src/lib/cache/types.ts`

- [ ] **Step 1: Create the types file**

```typescript
// src/lib/cache/types.ts

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
```

- [ ] **Step 2: Verify no type errors**

Run: `pnpm tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to `src/lib/cache/types.ts`

- [ ] **Step 3: Commit**

```bash
git add src/lib/cache/types.ts
git commit -m "feat(cache): add types for cache invalidation deep module"
```

---

## Task 2: Knowledge Base Hierarchy Helper + Tests

**Files:**

- Create: `src/lib/cache/__tests__/build-knowledge-tags.test.ts`
- Create: `src/lib/cache/cache-policies.ts` (partial — just `buildKnowledgeTags` + policy types for now)

- [ ] **Step 1: Write failing tests for `buildKnowledgeTags`**

```typescript
// src/lib/cache/__tests__/build-knowledge-tags.test.ts
import { describe, it, expect } from "vitest";
import { buildKnowledgeTags } from "../cache-policies";

describe("buildKnowledgeTags", () => {
  it("returns global tags for global scope", () => {
    const tags = buildKnowledgeTags("global", null, "org-123");
    expect(tags).toContain("knowledge-entries:global");
    expect(tags).toContain("knowledge-documents:global");
  });

  it("returns org + global tags for organization scope", () => {
    const tags = buildKnowledgeTags("organization", "org-123", "org-123");
    expect(tags).toContain("knowledge-entries:org:org-123");
    expect(tags).toContain("knowledge-documents:org:org-123");
    expect(tags).toContain("knowledge-entries:global");
    expect(tags).toContain("knowledge-documents:global");
  });

  it("returns team + global tags for team scope", () => {
    const tags = buildKnowledgeTags("team", "team-456", "org-123");
    expect(tags).toContain("knowledge-entries:team:team-456");
    expect(tags).toContain("knowledge-documents:team:team-456");
    expect(tags).toContain("knowledge-entries:global");
    expect(tags).toContain("knowledge-documents:global");
  });

  it("returns project + org + global + hierarchy tags for project scope", () => {
    const tags = buildKnowledgeTags("project", "proj-789", "org-123");
    expect(tags).toContain("knowledge-entries:project:proj-789");
    expect(tags).toContain("knowledge-documents:project:proj-789");
    expect(tags).toContain("knowledge-entries:org:org-123");
    expect(tags).toContain("knowledge-entries:global");
    expect(tags).toContain("knowledge-documents:global");
    expect(tags).toContain("knowledge-hierarchy:project:proj-789:org:org-123");
  });

  it("falls back to global-only tags when scopeId is null for non-global scope", () => {
    // Must NOT call CacheTags.knowledgeEntries("org", undefined) — that throws.
    // Instead, skip org-scoped tags and return global tags as fallback.
    const tags = buildKnowledgeTags("organization", null, "org-123");
    expect(tags).toContain("knowledge-entries:global");
    expect(tags).toContain("knowledge-documents:global");
    expect(tags).not.toContain("knowledge-entries:org:org-123");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/lib/cache/__tests__/build-knowledge-tags.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `buildKnowledgeTags` and the beginning of `cache-policies.ts`**

Create `src/lib/cache/cache-policies.ts` with the `buildKnowledgeTags` function and imports from `../../lib/cache-utils` for `CacheTags`. The function must:

- Accept `scope: "project" | "organization" | "global" | "team"`, `scopeId: string | null | undefined`, `organizationId: string`
- Map `"organization"` to `"org"` when calling `CacheTags.knowledgeEntries()` / `CacheTags.knowledgeDocuments()`
- For `"global"`: return global entries + documents tags
- For `"organization"`: return org-scoped entries/documents + global entries/documents
- For `"team"`: return team-scoped entries/documents + global entries/documents
- For `"project"`: return project-scoped entries/documents + org-scoped + global + hierarchy tag (via `CacheTags.knowledgeHierarchy(scopeId, organizationId)`)
- Guard against null/undefined scopeId for non-global scopes — do NOT call `CacheTags.knowledgeEntries("org", undefined)` (it throws per `cache-utils.ts:126-129`). Instead, skip scope-specific tags and return global tags only as fallback

Reference: Current duplicated logic at `src/features/knowledge-base/actions/create-entry.ts:60-72` and `src/lib/cache-utils.ts:454-529`

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/lib/cache/__tests__/build-knowledge-tags.test.ts`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/cache/cache-policies.ts src/lib/cache/__tests__/build-knowledge-tags.test.ts
git commit -m "feat(cache): add buildKnowledgeTags helper with tests"
```

---

## Task 3: CACHE_POLICIES Registry

**Files:**

- Modify: `src/lib/cache/cache-policies.ts` (add all policy entries)
- Create: `src/lib/cache/__tests__/cache-policies.test.ts`

- [ ] **Step 1: Write failing tests for key policies**

Test at least these representative policies:

- `project:create` — should return projectsByOrg, projectCount, dashboardStats, recentProjects
- `project:update` — should return project-specific tag + all from create
- `recording:update` — should return recording, recordingsByProject, recordingsByOrg, dashboardStats, recentRecordings
- `knowledge_base:create` — should delegate to `buildKnowledgeTags`
- `bot_session:create` — should return botSessions
- `bot_session:delete` — should return botSession + botSessions + notifications
- `organization:update` — should return organization + organizations
- `meeting:update` — should return meeting + meetings

Each test creates an `InvalidationContext` with test IDs and asserts the returned tag array.

```typescript
// src/lib/cache/__tests__/cache-policies.test.ts
import { describe, it, expect } from "vitest";
import { CACHE_POLICIES } from "../cache-policies";
import type { InvalidationContext } from "../types";

function makeCtx(
  overrides: Partial<InvalidationContext> = {},
): InvalidationContext {
  return {
    userId: "user-1",
    organizationId: "org-1",
    userTeamIds: ["team-1"],
    input: {},
    result: undefined,
    ...overrides,
  };
}

describe("CACHE_POLICIES", () => {
  it("project:create returns org-level project tags", () => {
    const tags = CACHE_POLICIES["project:create"]!(makeCtx());
    expect(tags).toContain("projects:org:org-1");
    expect(tags).toContain("project-count:org:org-1");
    expect(tags).toContain("dashboard:stats:org-1");
    expect(tags).toContain("dashboard:recent-projects:org-1");
  });

  it("project:update returns project-specific + org-level tags", () => {
    const tags = CACHE_POLICIES["project:update"]!(
      makeCtx({ input: { projectId: "proj-1" } }),
    );
    expect(tags).toContain("project:proj-1");
    expect(tags).toContain("project-template:proj-1");
    expect(tags).toContain("projects:org:org-1");
  });

  it("recording:update returns recording + project + org tags", () => {
    const tags = CACHE_POLICIES["recording:update"]!(
      makeCtx({ input: { recordingId: "rec-1", projectId: "proj-1" } }),
    );
    expect(tags).toContain("recording:rec-1");
    expect(tags).toContain("recordings:project:proj-1");
    expect(tags).toContain("recordings:org:org-1");
    expect(tags).toContain("dashboard:stats:org-1");
  });

  it("knowledge_base:create delegates to buildKnowledgeTags", () => {
    const tags = CACHE_POLICIES["knowledge_base:create"]!(
      makeCtx({ input: { scope: "project", scopeId: "proj-1" } }),
    );
    expect(tags).toContain("knowledge-entries:project:proj-1");
    expect(tags).toContain("knowledge-entries:global");
  });

  it("bot_session:delete returns session + org sessions + notifications", () => {
    const tags = CACHE_POLICIES["bot_session:delete"]!(
      makeCtx({ input: { sessionId: "sess-1" } }),
    );
    expect(tags).toContain("bot-session:sess-1");
    expect(tags).toContain("bot-sessions:org:org-1");
    expect(tags).toContain("notifications:user:user-1:org:org-1");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/lib/cache/__tests__/cache-policies.test.ts`
Expected: FAIL — `CACHE_POLICIES` not exported or keys missing

- [ ] **Step 3: Implement all CACHE_POLICIES entries**

Add the full `CACHE_POLICIES` record to `src/lib/cache/cache-policies.ts`. Each entry is keyed by `"resourceType:action"` and returns a `CachePolicy` function.

Derive every entry from the current `CacheInvalidation.*` methods in `src/lib/cache-utils.ts:206-598` cross-referenced with the audit metadata from each action file.

**IMPORTANT:** Policy keys must exactly match the `metadata.audit.resourceType` + `metadata.audit.action` values from the action files. Grep for `resourceType:` and `action:` in `src/features/` to verify each key. Common pitfalls: the codebase uses `"restore"` not `"unarchive"`, `"upload"` not `"create"` for recordings, `"bot_settings"` not `"bot"`.

**Reference table — every policy key with its CacheTags calls:**

| Policy Key                       | CacheTags Calls                                                                                         | Source Method                                                                   |
| -------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `project:create`                 | `projectsByOrg`, `projectCount`, `dashboardStats`, `recentProjects`                                     | `invalidateProjectCache()`                                                      |
| `project:update`                 | `project`, `projectsByOrg`, `projectCount`, `projectTemplate`, `dashboardStats`, `recentProjects`       | `invalidateProject()`                                                           |
| `project:delete`                 | same as `project:update`                                                                                | `invalidateProject()`                                                           |
| `project:archive`                | same as `project:update`                                                                                | `invalidateProject()`                                                           |
| `project:restore`                | same as `project:update`                                                                                | `invalidateProject()`                                                           |
| `recording:upload`               | `recordingsByProject`, `recordingsByOrg`, `dashboardStats`, `recentRecordings`                          | `invalidateProjectRecordings()`                                                 |
| `recording:update`               | `recording`, `recordingsByProject`, `recordingsByOrg`, `dashboardStats`, `recentRecordings`             | `invalidateRecording()`                                                         |
| `recording:delete`               | same as `recording:update`                                                                              | `invalidateRecording()`                                                         |
| `recording:archive`              | same as `recording:update`                                                                              | `invalidateRecording()`                                                         |
| `recording:restore`              | same as `recording:update`                                                                              | `invalidateRecording()`                                                         |
| `recording:move`                 | `recording`, `recordingsByProject` (old + new), `recordingsByOrg`, `dashboardStats`, `recentRecordings` | `invalidateRecording()` x2                                                      |
| `recording:reprocess`            | `recording`, `summary`                                                                                  | `invalidateRecording()` + `invalidateSummary()`                                 |
| `knowledge_base:create`          | delegates to `buildKnowledgeTags(scope, scopeId, orgId)`                                                | `invalidateKnowledge()` + `invalidateKnowledgeHierarchy()`                      |
| `knowledge_base:update`          | same as `knowledge_base:create`                                                                         | same                                                                            |
| `knowledge_base:delete`          | same as `knowledge_base:create`                                                                         | same                                                                            |
| `knowledge_base_document:delete` | same as `knowledge_base:create`                                                                         | same                                                                            |
| `knowledge_base_document:upload` | same as `knowledge_base:create`                                                                         | same                                                                            |
| `meeting:create`                 | `meetings`                                                                                              | `invalidateMeetings()`                                                          |
| `meeting:update`                 | `meeting`, `meetings`, `calendarMeetings`                                                               | `invalidateMeeting()` + `invalidateMeetings()` + `invalidateCalendarMeetings()` |
| `agenda:create`                  | `meetingAgendaItems`                                                                                    | `invalidateMeetingAgendaItems()`                                                |
| `agenda:update`                  | same as `agenda:create`                                                                                 | same                                                                            |
| `agenda:delete`                  | same as `agenda:create`                                                                                 | same                                                                            |
| `agenda:generate`                | same as `agenda:create`                                                                                 | same                                                                            |
| `bot_settings:update`            | `botSettings`                                                                                           | `invalidateBotSettings()`                                                       |
| `bot_session:create`             | `botSessions`                                                                                           | `invalidateBotSessions()`                                                       |
| `bot_session:update`             | `botSession`, `botSessions`                                                                             | `invalidateBotSession()`                                                        |
| `bot_session:delete`             | `botSession`, `botSessions`, `notifications`, `notificationUnreadCount`                                 | `invalidateBotSession()` + `invalidateNotifications()`                          |
| `organization:create`            | `organizations`                                                                                         | `invalidateOrganizations()`                                                     |
| `organization:update`            | `organization`, `organizations`                                                                         | `invalidateOrganization()` + `invalidateOrganizations()`                        |
| `organization:delete`            | same as `organization:update`                                                                           | same                                                                            |
| `settings:update`                | `organization`, `organizations`                                                                         | `invalidateOrganization()` + `invalidateOrganizations()`                        |
| `invitation:invite`              | `organization`, `orgMembers`                                                                            | `invalidateOrganization()` + `invalidateOrganizationMembers()`                  |
| `integration:disconnect`         | `googleConnection` or `microsoftConnection` (based on `input.provider`)                                 | `invalidateGoogleConnection()` / `invalidateMicrosoftConnection()`              |
| `project_template:create`        | `project`, `projectTemplate`, `projectsByOrg`, `dashboardStats`, `recentProjects`                       | `invalidateProject()`                                                           |
| `project_template:update`        | `projectTemplate`                                                                                       | `invalidateProjectTemplate()`                                                   |
| `project_template:delete`        | `project`, `projectsByOrg`, `dashboardStats`, `recentProjects`                                          | `invalidateProject()`                                                           |

**Mutation actions without existing cache invalidation (no policy needed, but add a no-op entry to suppress dev warnings):** Any `resourceType:action` pairs found in the codebase that have `category: "mutation"` but no corresponding `CacheInvalidation.*` call today don't need policies. To suppress dev-mode warnings, add entries that return `[]`. Search for these with: `grep -r '"category": "mutation"' src/features/ --include="*.ts" -l` and cross-reference with the table above.

Each policy function should call `CacheTags.*` from `src/lib/cache-utils.ts` using `ctx.organizationId` (for both orgCode and organizationId params), `ctx.userId`, and IDs from `ctx.input`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/lib/cache/__tests__/cache-policies.test.ts`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/cache/cache-policies.ts src/lib/cache/__tests__/cache-policies.test.ts
git commit -m "feat(cache): add CACHE_POLICIES registry with policy tests"
```

---

## Task 4: Cache Invalidation Middleware + Tests

**Files:**

- Create: `src/lib/cache/cache-invalidation-middleware.ts`
- Create: `src/lib/cache/__tests__/cache-invalidation-middleware.test.ts`

- [ ] **Step 1: Write failing middleware tests**

Test these behaviors:

1. Calls `invalidateCache` with correct tags when `audit.category === "mutation"` and policy exists
2. Skips when `audit` is missing
3. Skips when `audit.category !== "mutation"`
4. Skips when `metadata.invalidate === false`
5. Uses `metadata.invalidate` function when provided (explicit override)
6. Logs dev-mode warning when no policy found for a mutation
7. Catches policy errors and still returns result
8. Does NOT call `invalidateCache` when the action body throws an error

Mock `invalidateCache` from `@/lib/cache-utils` and `next-safe-action`'s `MiddlewareResult`. The middleware signature must match the pattern in `src/lib/server-action-client/audit-middleware.ts` — it receives `{ next, ctx, metadata }`.

```typescript
// src/lib/cache/__tests__/cache-invalidation-middleware.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock cache-utils before importing middleware
vi.mock("@/lib/cache-utils", () => ({
  invalidateCache: vi.fn(),
  CacheTags: {
    projectsByOrg: (org: string) => `projects:org:${org}`,
    projectCount: (org: string) => `project-count:org:${org}`,
    dashboardStats: (org: string) => `dashboard:stats:${org}`,
    recentProjects: (org: string) => `dashboard:recent-projects:${org}`,
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn() },
}));

import { cacheInvalidationMiddleware } from "../cache-invalidation-middleware";
import { invalidateCache } from "@/lib/cache-utils";

// ... test cases per the 7 behaviors above
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/lib/cache/__tests__/cache-invalidation-middleware.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement the middleware**

Create `src/lib/cache/cache-invalidation-middleware.ts`. The middleware:

1. Calls `await next({ ctx })` first — action body runs
2. After success, checks `metadata.audit?.category === "mutation"`
3. Checks `metadata.invalidate` for explicit opt-out (`false`) or override (function)
4. Resolves policy from `CACHE_POLICIES[resourceType:action]`
5. Builds `InvalidationContext` from `ctx.user.id`, `ctx.organizationId`, `ctx.userTeamIds`, parsedInput (from result), and result data
6. Calls `invalidateCache(...tags)` if tags are non-empty
7. Wraps policy resolution in try/catch — logs errors, never throws

Reference the middleware signature from `src/lib/server-action-client/audit-middleware.ts:14-24` for the exact `{ next, ctx, metadata }` types. Import `ActionContext` and `Metadata` types from `../server-action-client/action-client`.

**Critical details:**

- The `next()` call returns a `MiddlewareResult` which contains `parsedInput` and `data` on the result object. Extract `parsedInput` for `ctx.input` and `data` for `ctx.result`.
- Safely cast `parsedInput`: `const input = (typeof result.parsedInput === 'object' && result.parsedInput !== null) ? result.parsedInput as Record<string, unknown> : {};`
- If `next()` throws (action body failed), the middleware must NOT call `invalidateCache`. Wrap the `next()` call in try/catch: only proceed with invalidation if no error was thrown. Re-throw the error after skipping invalidation.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/lib/cache/__tests__/cache-invalidation-middleware.test.ts`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/cache/cache-invalidation-middleware.ts src/lib/cache/__tests__/cache-invalidation-middleware.test.ts
git commit -m "feat(cache): add cacheInvalidationMiddleware with tests"
```

---

## Task 5: `invalidateFor()` Escape Hatch

**Files:**

- Create: `src/lib/cache/invalidate-for.ts`

- [ ] **Step 1: Create `invalidateFor`**

```typescript
// src/lib/cache/invalidate-for.ts
import { invalidateCache } from "../cache-utils";
import { logger } from "../logger";
import { CACHE_POLICIES } from "./cache-policies";
import type { InvalidationContext } from "./types";

/**
 * Escape hatch for invalidating cache outside the action middleware chain.
 * Used by services called from workflows/webhooks (not actions).
 */
export function invalidateFor(
  resourceType: string,
  action: string,
  ctx: Partial<InvalidationContext>,
): void {
  const key = `${resourceType}:${action}`;
  const policy = CACHE_POLICIES[key];

  if (!policy) {
    if (process.env.NODE_ENV === "development") {
      logger.warn(`[cache] No policy found for "${key}"`, {
        component: "invalidateFor",
      });
    }
    return;
  }

  const fullCtx: InvalidationContext = {
    userId: ctx.userId ?? "",
    organizationId: ctx.organizationId ?? "",
    userTeamIds: ctx.userTeamIds ?? [],
    input: ctx.input ?? {},
    result: ctx.result ?? undefined,
  };

  try {
    const tags = policy(fullCtx);

    if (tags.length === 0 && process.env.NODE_ENV === "development") {
      logger.warn(
        `[cache] Policy "${key}" resolved zero tags — required context fields may be missing`,
        { component: "invalidateFor", ctx: fullCtx },
      );
    }

    if (tags.length > 0) {
      invalidateCache(...tags);
    }
  } catch (error) {
    logger.error(`[cache] Policy "${key}" threw an error`, {
      component: "invalidateFor",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
```

- [ ] **Step 2: Verify no type errors**

Run: `pnpm tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/cache/invalidate-for.ts
git commit -m "feat(cache): add invalidateFor escape hatch for services/workflows"
```

---

## Task 6: `tagsFor()` Read-Side Helper

**Files:**

- Create: `src/lib/cache/tags-for.ts`

- [ ] **Step 1: Create `tagsFor`**

The function maps `(CacheEntity, refs)` to the appropriate `CacheTags.*` calls. This is a large switch/map that covers all 37 entity types in the `CacheEntity` union.

Reference `src/lib/cache-utils.ts:11-188` for all `CacheTags` generators and their parameter names.

Each entity maps to 1-3 tag generators. For example:

- `"project"` with `{ projectId, organizationId }` → `[CacheTags.project(projectId), CacheTags.projectsByOrg(organizationId)]`
- `"recording"` with `{ recordingId, projectId, organizationId }` → `[CacheTags.recording(recordingId), CacheTags.recordingsByProject(projectId), CacheTags.recordingsByOrg(organizationId)]`
- `"knowledge"` with `{ scope, scopeId }` → `[CacheTags.knowledgeEntries(scope, scopeId)]`

Filter out undefined values from refs before generating tags. Return empty array if required refs are missing.

- [ ] **Step 2: Verify no type errors**

Run: `pnpm tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/cache/tags-for.ts
git commit -m "feat(cache): add tagsFor read-side helper for cache wrappers"
```

---

## Task 7: Barrel Export

**Files:**

- Create: `src/lib/cache/index.ts`

- [ ] **Step 1: Create barrel export**

```typescript
// src/lib/cache/index.ts
export { CACHE_POLICIES, buildKnowledgeTags } from "./cache-policies";
export { cacheInvalidationMiddleware } from "./cache-invalidation-middleware";
export { invalidateFor } from "./invalidate-for";
export { tagsFor } from "./tags-for";
export type { CachePolicy, InvalidationContext, CacheEntity } from "./types";
```

- [ ] **Step 2: Verify no type errors**

Run: `pnpm tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/cache/index.ts
git commit -m "feat(cache): add barrel export for cache module"
```

---

## Task 8: Wire Middleware into Action Client

**Files:**

- Modify: `src/lib/server-action-client/action-client.ts`

- [ ] **Step 1: Extend metadata schema with `invalidate` field**

In `src/lib/server-action-client/action-client.ts`, add to `schemaMetadata`:

```typescript
invalidate: z.custom<CachePolicy | false>().optional(),
```

Import `CachePolicy` from `../cache/types`.

- [ ] **Step 2: Append middleware to action client chain**

Change the `authorizedActionClient` definition from:

```typescript
export const authorizedActionClient = createSafeActionClient({
  handleServerError: handleActionError,
  defineMetadataSchema: () => schemaMetadata,
})
  .use(actionLoggerMiddleware)
  .use(authenticationMiddleware)
  .use(auditLoggingMiddleware);
```

To:

```typescript
export const authorizedActionClient = createSafeActionClient({
  handleServerError: handleActionError,
  defineMetadataSchema: () => schemaMetadata,
})
  .use(actionLoggerMiddleware)
  .use(authenticationMiddleware)
  .use(auditLoggingMiddleware)
  .use(cacheInvalidationMiddleware);
```

Import `cacheInvalidationMiddleware` from `../cache/cache-invalidation-middleware`.

- [ ] **Step 3: Verify no type errors**

Run: `pnpm tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors. If there are type mismatches between the middleware signature and next-safe-action's expected types, adjust the middleware's parameter types to match `auditLoggingMiddleware`'s pattern exactly.

- [ ] **Step 4: Run all existing tests to verify no regressions**

Run: `pnpm vitest run`
Expected: All existing tests pass. The middleware fires alongside existing `CacheInvalidation.*` calls — both are idempotent.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server-action-client/action-client.ts
git commit -m "feat(cache): wire cacheInvalidationMiddleware into authorizedActionClient"
```

---

## Task 9: Run Full Validation

- [ ] **Step 1: Run all tests**

Run: `pnpm vitest run`
Expected: All tests pass (existing + new cache tests)

- [ ] **Step 2: Run type check**

Run: `pnpm tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Run linter**

Run: `pnpm lint`
Expected: No lint errors in new files

- [ ] **Step 4: Run build**

Run: `pnpm build`
Expected: Build succeeds. The middleware is now active on all `authorizedActionClient` actions.
