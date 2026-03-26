# Cache Invalidation Deep Module

**Date:** 2026-03-22
**GitHub Issue:** #589
**Status:** Approved

## Problem

Cache invalidation knowledge is scattered across 46 files. The `CacheInvalidation` object (47 methods, 598 lines in `cache-utils.ts`) and `CacheTags` (80+ generators) force every mutation to manually declare which tags to bust. This creates three concrete problems:

1. **Invisible coupling.** Adding a cached query (e.g., `getCachedProjectsByUser`) requires updating every mutation that could affect it. There is no mechanism to detect a missing invalidation — it manifests as stale UI data in production.

2. **Duplicated logic.** The knowledge base's 4-level scope hierarchy produces 15 lines of identical conditional invalidation logic in `create-entry.ts`, `delete-entry.ts`, `update-entry.ts`, and `upload-document.ts`.

3. **Known bugs found during analysis:**
   - `AIInsightService.createAIInsight()` skips AI insight cache invalidation
   - `configurePostActions()` in meeting actions skips meeting post-actions cache invalidation
   - `CacheInvalidation.invalidateSummary()` and `NotificationService` both use `revalidateTag(..., "max")` instead of `invalidateCache()`, inconsistent with the immediate invalidation pattern used everywhere else

## Design

### Architecture Overview

Three new public APIs replace the current `CacheInvalidation` + `CacheTags` surface:

```
Actions (~31 call sites)         Services/Workflows (~15 call sites)  Cache wrappers (24 files)
        │                                    │                                │
        ▼                                    ▼                                ▼
┌──────────────────┐              ┌──────────────────┐             ┌──────────────────┐
│ cacheInvalidation│              │  invalidateFor() │             │    tagsFor()     │
│   Middleware      │              │                  │             │                  │
│ (auto-resolves   │              │ (explicit escape │             │ (centralized tag │
│  from audit      │              │  hatch, same     │             │  generation for  │
│  metadata)       │              │  CACHE_POLICIES) │             │  "use cache"     │
└────────┬─────────┘              └────────┬─────────┘             │  functions)      │
         │                                 │                       └──────────────────┘
         ▼                                 ▼
┌─────────────────────────────────────────────────────┐
│              CACHE_POLICIES registry                │
│                                                     │
│  Record<`${resourceType}:${action}`, CachePolicy>   │
│  Single source of truth for tag relationships       │
│                                                     │
│  Each policy: (InvalidationContext) => string[]     │
└─────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│          CacheTags (becomes module-private)          │
│          invalidateCache() / revalidateTag()        │
└─────────────────────────────────────────────────────┘
```

### Component 1: `CACHE_POLICIES` Registry

A `Record<string, CachePolicy>` keyed by `"resourceType:action"`. Each policy is a pure function that receives an `InvalidationContext` and returns an array of cache tag strings. This is the single source of truth for which tags each mutation affects.

```typescript
interface InvalidationContext {
  readonly userId: string;
  readonly organizationId: string; // org UUID — used for all org-scoped tags
  readonly userTeamIds: string[];
  readonly input: Record<string, unknown>;
  readonly result: unknown;
}

type CachePolicy = (ctx: InvalidationContext) => string[];
```

**Note on `organizationId` vs `orgCode`:** The current codebase uses both names interchangeably — they refer to the same value (the organization's UUID from Better Auth). Some `CacheTags` generators accept a parameter called `orgCode`, others `organizationId`. The `InvalidationContext` unifies this as a single `organizationId` field. All policy functions use `ctx.organizationId` when calling any `CacheTags` generator that expects either `orgCode` or `organizationId`.

The registry key format (`resourceType:action`) matches the existing `metadata.audit` structure that most action files already declare. No new metadata is needed for the common case.

**Location:** `src/lib/cache/cache-policies.ts`

### Component 2: `cacheInvalidationMiddleware`

A next-safe-action middleware appended to the `authorizedActionClient` chain, after `auditLoggingMiddleware`. It runs after the action body succeeds and auto-resolves the cache policy from `metadata.audit.resourceType` + `metadata.audit.action`.

Behavior:

- Skips if `metadata.audit` is missing or `category !== "mutation"`
- Skips if `metadata.invalidate === false` (explicit opt-out)
- Uses `metadata.invalidate` function if provided (explicit override)
- Otherwise resolves from `CACHE_POLICIES[resourceType:action]`
- Logs a dev-mode warning if no policy is found for a mutation
- Assembles `InvalidationContext` from `ctx.user.id`, `ctx.organizationId`, `ctx.userTeamIds`, the action's `parsedInput`, and its return value
- Calls `invalidateCache(...tags)` with the resolved tags

**Integration point:** Added as `.use(cacheInvalidationMiddleware)` after `.use(auditLoggingMiddleware)` on `authorizedActionClient` in `action-client.ts`.

The metadata schema gains one optional field:

```typescript
// Added to schemaMetadata
invalidate: z.custom<CachePolicy | false>().optional(),
```

- `undefined` (default): auto-resolve from audit metadata
- `CachePolicy` function: explicit override for edge cases
- `false`: skip invalidation entirely

### Component 3: `invalidateFor()` Escape Hatch

For the ~15 call sites outside the action middleware chain (13 service files + 2 workflow files):

```typescript
function invalidateFor(
  resourceType: string,
  action: string,
  ctx: Partial<InvalidationContext>,
): void;
```

Uses the same `CACHE_POLICIES` registry. Callers provide whatever context they have; missing fields default to empty strings/arrays. In development mode, a warning is logged when a policy exists but required context fields (e.g., `organizationId` for org-scoped tags) are missing — preventing silent under-invalidation.

**Location:** Exported from `src/lib/cache/index.ts`

### Component 4: `tagsFor()` Read-Side Helper

Centralizes tag generation for the 24 `"use cache"` wrapper files:

```typescript
type CacheEntity =
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

function tagsFor(
  entity: CacheEntity,
  refs: Record<string, string | undefined>,
): string[];
```

The `entity` parameter uses a string literal union for compile-time safety — misspelled entity names are caught by the type checker. Replaces direct `CacheTags.*()` calls in cache wrappers. Enables a lint test that verifies every tag registered on the read side appears in at least one policy on the write side.

**Location:** Exported from `src/lib/cache/index.ts`

### Knowledge Base Hierarchy Helper

The 4-level scope hierarchy logic (currently duplicated across 4 action files) is extracted into a single `buildKnowledgeTags()` helper used by the `knowledge_base:*` policies:

```typescript
function buildKnowledgeTags(
  scope: "project" | "organization" | "global" | "team",
  scopeId: string | null | undefined,
  organizationId: string,
): string[];
```

This encodes the hierarchy walk (project invalidation also busts org + global), the `knowledgeHierarchy` composite tag, and scope validation — written once, tested once. Note: `buildKnowledgeTags` maps `"organization"` to `"org"` internally when calling `CacheTags.knowledgeEntries()` / `CacheTags.knowledgeDocuments()`, since those generators use the shorter `"org"` form.

## Data Flow

### Action mutation (common case):

```
1. Client calls server action
2. actionLoggerMiddleware logs the action
3. authenticationMiddleware authenticates/authorizes
4. auditLoggingMiddleware records audit trail
5. Action body executes (service call, returns data)
6. cacheInvalidationMiddleware:
   a. Reads metadata.audit → "project:update"
   b. Looks up CACHE_POLICIES["project:update"]
   c. Builds InvalidationContext from ctx + parsedInput + result
   d. Calls policy(ctx) → ["project:abc", "projects:org:xyz", ...]
   e. Calls invalidateCache(...tags)
7. Response returned to client
```

### Workflow/service mutation (escape hatch):

```
1. Service/workflow performs mutation
2. Calls invalidateFor("recording", "update", { organizationId, input: { recordingId, projectId } })
3. invalidateFor resolves CACHE_POLICIES["recording:update"]
4. Calls policy(ctx) → tag strings
5. Calls invalidateCache(...tags)
```

## Error Handling

- If no policy is found for a mutation, a `console.warn` fires in development. No error is thrown — missing invalidation is a staleness issue, not a crash.
- If a policy function throws (e.g., missing required ID), the error is caught, logged, and the action result is returned unchanged. Cache staleness is preferable to action failure.
- The `invalidateFor()` escape hatch accepts `Partial<InvalidationContext>`. In development, a warning is logged when a resolved policy returns zero tags despite the policy key being found — this signals that required context fields are missing.

## Invalidation Ownership

**Rule:** Cache invalidation is owned by the action layer (via middleware), not the service layer.

Many services currently call `CacheInvalidation.*` internally (e.g., `RecordingService.createRecording()` calls `invalidateProjectRecordings()`). These service-layer calls were added because some services are called both from actions and from workflows. The migration strategy is:

- **Services called only by actions:** Remove `CacheInvalidation.*` from the service. The middleware handles it.
- **Services called by both actions and workflows:** Remove `CacheInvalidation.*` from the service. The action middleware handles the action path; the workflow adds an explicit `invalidateFor()` call.
- **Services called only by workflows/webhooks:** Convert the service-layer `CacheInvalidation.*` to `invalidateFor()`.

During Phase 1, both the middleware and existing service-layer calls fire. This is safe — `invalidateCache()` is idempotent. During Phase 2+4, service-layer calls are removed and ownership transfers fully to the action/workflow layer.

## `revalidatePath()` Note

38 files currently call `revalidatePath()`, often co-located with `CacheInvalidation.*` calls. The policy system does not absorb `revalidatePath()` — these calls remain manual. During Phase 2 migration, when removing `CacheInvalidation.*` calls from action files, `revalidatePath()` calls must be preserved. The migration checklist for each file should verify this.

## Testing Strategy

### New tests:

1. **Policy unit tests** — for each `CACHE_POLICIES` entry, assert that given an `InvalidationContext`, the returned tag array matches expected tags. Pure function tests.
2. **Coverage lint test** — scan all `*.cache.ts` files, extract every `CacheTags.*` call (or `tagsFor()` call after Phase 3 migration), and verify each tag appears in at least one `CACHE_POLICIES` entry. The test evolves alongside the migration: initially it scans for `CacheTags.*`, after Phase 3 it scans for `tagsFor()` usage.
3. **Middleware integration test** — verify middleware calls `invalidateCache` with correct tags on mutation success, skips on non-mutation, warns on missing policy.
4. **`buildKnowledgeTags` test** — verify all 4 scope levels produce correct tags with hierarchy propagation.

### No tests to delete:

No existing tests cover cache invalidation.

## File Plan

### New files:

- `src/lib/cache/cache-policies.ts` — `CACHE_POLICIES` registry + `CachePolicy` type + `InvalidationContext` type + `buildKnowledgeTags` helper
- `src/lib/cache/cache-invalidation-middleware.ts` — middleware function
- `src/lib/cache/tags-for.ts` — `tagsFor()` helper for cache wrappers
- `src/lib/cache/invalidate-for.ts` — `invalidateFor()` escape hatch
- `src/lib/cache/index.ts` — barrel export of public API
- `src/lib/cache/__tests__/cache-policies.test.ts` — policy unit tests
- `src/lib/cache/__tests__/cache-invalidation-middleware.test.ts` — middleware tests
- `src/lib/cache/__tests__/build-knowledge-tags.test.ts` — hierarchy tests

### Modified files:

- `src/lib/server-action-client/action-client.ts` — add `.use(cacheInvalidationMiddleware)`, extend `schemaMetadata` with `invalidate` field
- `src/lib/cache-utils.ts` — no changes in Phase 1-2; in Phase 4, `CacheTags` becomes module-private and `CacheInvalidation` is deleted

### Files modified during migration (Phase 2-4):

- ~31 action files — delete `CacheInvalidation.*` calls (preserve `revalidatePath()` calls)
- ~15 service/workflow files — remove or replace `CacheInvalidation.*` with `invalidateFor()`
- 24 cache wrapper files — replace `CacheTags.*` with `tagsFor()`

## Migration Plan

### Phase 1: Ship alongside existing system

- Create `src/lib/cache/` module with all new files
- Add `cacheInvalidationMiddleware` to `authorizedActionClient` chain
- Populate `CACHE_POLICIES` for all existing resourceType:action pairs
- Existing `CacheInvalidation.*` calls remain — redundant but harmless (idempotent)
- Ship policy unit tests and coverage lint test

### Phase 2: Remove action-layer calls

- For each action file, delete the `CacheInvalidation.*` call
- Middleware now handles it
- One feature at a time; start with knowledge-base (highest ROI — eliminates duplicated hierarchy logic)

### Phase 3: Migrate cache wrappers

- Replace `CacheTags.*` with `tagsFor()` in the 24 cache wrapper files
- Enables the lint test to verify read/write tag consistency

### Phase 4: Migrate service/workflow callers

- Remove `CacheInvalidation.*` from services that are only called by actions (middleware handles it)
- Convert remaining ~15 service/workflow call sites to `invalidateFor()`
- Delete `CacheInvalidation` object from `cache-utils.ts`
- Make `CacheTags` module-private (only used by `cache-policies.ts` and `tags-for.ts`)

### Phase 5: Fix known bugs

- Add policies for `ai_insight:create` and `meeting_post_action:update`
- Standardize `invalidateSummary` and notification invalidation to use `invalidateCache()` instead of mixed `revalidateTag`

## Trade-offs

**Gains:**

- ~31 action files get zero-line invalidation (auto from audit metadata)
- Single source of truth for tag relationships (`CACHE_POLICIES`)
- Adding a cached query = adding one entry to `CACHE_POLICIES`, zero mutation changes
- Consistent invalidation timing (always after success, never on failure)
- Pure-function policies are trivially unit-testable

**Costs:**

- Locality: reading an action file no longer shows which tags it busts (must check `CACHE_POLICIES`)
- Two invalidation patterns during and after migration: middleware (actions) + `invalidateFor()` (services)
- `revalidatePath()` calls remain manual — not absorbed into the policy system
- Dev-mode warning for missing policies is a soft signal, not a hard error
