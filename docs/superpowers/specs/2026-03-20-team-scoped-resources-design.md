# Team-Scoped Resources Design

## Overview

Implement team-level resource isolation for the Inovy platform. Resources (projects, meetings) can be assigned to teams, providing hard isolation where only team members and org admins can access them. Resources without a team assignment remain org-wide and visible to all organization members.

## Decisions

| Decision                  | Choice                                 | Rationale                                                              |
| ------------------------- | -------------------------------------- | ---------------------------------------------------------------------- |
| Isolation model           | Hard isolation with org admin override | Non-members cannot see team-scoped resources at all (404 pattern)      |
| Team-scoped entities      | Projects + Meetings independently      | Recordings, tasks, AI insights inherit team scope from parent project  |
| Default assignment        | Org-wide (teamId = null)               | Gradual adoption; existing data stays accessible                       |
| Navigation model          | Team hub pages + sidebar team switcher | Hub for dedicated views, switcher for global filtering                 |
| Creation behavior         | Context-aware auto-assignment          | Active team auto-assigns; "All" shows team picker with org-wide option |
| Visibility to non-members | Completely invisible                   | Consistent with existing org isolation (404, not 403)                  |
| Schema approach           | Direct teamId FK on resources          | Mirrors existing organizationId pattern; simple, performant            |

## Section 1: Database Schema Changes

### Projects table

Add nullable `teamId` foreign key:

```typescript
teamId: text("team_id").references(() => teams.id, { onDelete: "set null" });
```

- `onDelete: "set null"` — if a team is deleted, resources become org-wide rather than lost
- Composite index on `(organizationId, teamId)` for the common query pattern `WHERE organizationId = ? AND teamId = ?`

### Meetings table

Add nullable `teamId` foreign key:

```typescript
teamId: text("team_id").references(() => teams.id, { onDelete: "set null" });
```

- Same `onDelete: "set null"` behavior as projects
- Composite index on `(organizationId, teamId)`

### Meeting/project team consistency

Meetings have an independent `teamId` from their project. To prevent inconsistency with child resources:

- Meetings without a `projectId` can have any `teamId` (or null) independently
- Meetings with a `projectId` inherit team visibility from the project — the meeting's own `teamId` determines who can see the meeting itself, but recordings created from the meeting inherit from the project (since recordings belong to projects)
- When linking a meeting to a project, the UI warns if the meeting's team differs from the project's team: "This meeting belongs to [Team A] but the project belongs to [Team B]. Recordings will be visible to [Team B] members."

### Knowledge base

Extend `knowledgeBaseScopeEnum` to include `"team"`:

```typescript
export const knowledgeBaseScopeEnum = [
  "project",
  "organization",
  "global",
  "team",
] as const;
```

When `scope = "team"`, `scopeId` contains the team ID. Applies to both `knowledgeBaseEntries` and `knowledgeBaseDocuments`.

Note: This is a TypeScript const array used in `text("scope", { enum: ... })`, not a Postgres enum. This is a code-only change — no database migration needed for the enum itself.

### Chat embeddings

No schema change. They reference `projectId`, which carries the team scope. Queries that filter embeddings by project already inherit team isolation.

### Chat conversations

No schema change. Project-scoped conversations inherit team scope from their project. Organization-scoped conversations remain org-wide.

### Qdrant payload

Already has `teamId?: string[]` in `QdrantPayload` type and `teamId` is already indexed as a keyword field. Ensure all upsert paths populate it from the parent project's `teamId`.

### Embedding cache

No change needed — it's a content-hash deduplication cache with no scoping.

### Migration

One migration file adding:

- `teamId` column to `projects` table with FK and composite index `(organizationId, teamId)`
- `teamId` column to `meetings` table with FK and composite index `(organizationId, teamId)`

No migration needed for knowledge base scope enum (TypeScript const array, not a Postgres enum).

## Section 2: Team Isolation Query Layer

### Query filtering logic

```
If user is org admin/owner/superadmin:
  → See everything in the org (bypass team filter)
If active team is set:
  → Show resources where teamId = activeTeamId
If active team is "All" (null):
  → Show resources where teamId IN (user's team IDs) OR teamId IS NULL
```

`teamId = null` means org-wide, visible to all org members. `teamId = <id>` means only that team's members + org admins.

### New helpers

**`buildTeamFilter(activeTeamId, userTeamIds, isOrgAdmin)`** — returns Drizzle `where` conditions for team-scoped queries. Analogous to existing `filterByOrganization()`.

**`assertTeamAccess(resourceTeamId, userTeamIds, isOrgAdmin)`** — verifies user can access a specific resource's team. Returns 404 for non-members (not 403), consistent with existing org isolation pattern.

### User team IDs retrieval

The `buildTeamFilter` helper requires `userTeamIds`. These are resolved as follows:

- The `authorizedActionClient` middleware (and `getBetterAuthSession`) query the `team_members` table directly via Drizzle (`SELECT team_id FROM team_members WHERE user_id = ?`) to get the user's team IDs
- These are cached in the middleware context alongside `activeTeamId` so data-access layers don't need request headers
- For server components, `getBetterAuthSession()` returns `userTeamIds` as part of `BetterAuthSessionData`

### Applied at these layers

| Layer               | How                                                      |
| ------------------- | -------------------------------------------------------- |
| `ProjectsQueries`   | Add `teamId` filter to all select queries                |
| `MeetingsQueries`   | Add `teamId` filter to all select queries                |
| `RecordingsQueries` | JOIN through project to check team access                |
| `TasksQueries`      | JOIN through project to check team access                |
| `AI Insights`       | Inherit via recording → project chain                    |
| `ChatConversations` | Project-scoped conversations filtered via project's team |
| `Qdrant searches`   | Add `teamId` filter to all RAG queries (see Section 5)   |
| `Knowledge base`    | Filter by scope="team" + scopeId=teamId                  |

### Session and middleware changes

**`BetterAuthSessionData` interface** — extend to include:

```typescript
interface BetterAuthSessionData {
  isAuthenticated: boolean;
  user: BetterAuthUser | null;
  organization: BetterAuthOrganization | null;
  member: BetterAuthMember | null;
  activeTeamId: string | null; // NEW
  userTeamIds: string[]; // NEW
}
```

**`fetchAndBuildSession()`** in `better-auth-session.ts` — read `activeTeamId` from the raw session data returned by `auth.api.getSession()`, and query `team_members` table for the user's team IDs. If `auth.api.getSession()` does not include `activeTeamId` in its response, fall back to a direct Drizzle query on the `sessions` table: `SELECT active_team_id FROM sessions WHERE id = ?` (same fallback pattern as `setActiveTeam`).

**`authorizedActionClient` middleware** in `action-client.ts` — extend the context object passed to actions:

```typescript
// Current ctx: { session, user, organizationId }
// New ctx:     { session, user, organizationId, activeTeamId, userTeamIds }
```

This makes `activeTeamId` and `userTeamIds` available to all authorized server actions without additional queries.

## Section 3: UI — Team Switcher & Navigation

### Team switcher in sidebar

Placed below the existing org switcher. Shows:

- "All Teams" option at the top (sets `activeTeamId = null`)
- User's teams (fetched from user's team memberships)
- Active team highlighted with a checkmark

Selecting a team calls Better Auth's `setActiveTeam` API endpoint (provided by the organization plugin when `teams.enabled = true`), which updates `activeTeamId` on the session. If `setActiveTeam` is not available in the Better Auth API surface, implement a custom server action that updates `activeTeamId` directly on the session record via Drizzle.

### Team hub pages

Enhance existing `/teams/[teamId]` pages:

- `/teams/[teamId]` — dashboard showing team's projects, recent meetings, member count
- `/teams/[teamId]/members` — already built, member management
- `/teams/[teamId]/settings` — already built, team settings

### New: `/teams` index page

Route: `app/(main)/teams/page.tsx`

Server component that:

1. Calls `getBetterAuthSession()` for auth context
2. Fetches teams via `TeamService.getUserTeams()` (regular users) or `TeamService.getTeamsByOrganization()` (org admins)
3. Renders a card grid with team name, description, member count
4. Each card links to `/teams/[teamId]`

### Sidebar navigation

Add "Teams" link to `navLinks` in `navigation.ts`, pointing to `/teams`.

### Filtering behavior

When a team is active in the switcher:

- Dashboard, `/projects`, `/meetings`, `/tasks`, `/recordings` — filtered to active team's resources + org-wide resources
- `/chat` — project-scoped chats filtered by team's projects; org-scoped chats always visible

When "All Teams" is selected:

- Show resources from all user's teams + org-wide resources

## Section 4: Resource Creation & Visibility Warning

### Context-aware creation

1. **Active team set** → auto-assign `teamId`, show badge: "This project will be visible to [Team Name] members only"
2. **"All Teams" selected** → show team picker dropdown:
   - User's teams listed
   - "Org-wide" option at the bottom
3. **Selecting "Org-wide"** → inline warning callout: "This project will be visible to all members of your organization."

### Implementation

- Creation forms receive `activeTeamId` and `userTeams` as props
- Team picker is a `Select` component, only rendered when active team is null
- Server action input schemas for `createProject` / `createMeeting` accept optional `teamId`
- Validation: if `teamId` provided, verify user is a member of that team (or is org admin)

### Reassigning resources

- Project/meeting settings get a "Team" field for org admins and team managers
- Moving to a different team shows confirmation: "Members of [Old Team] will lose access to this project and all its recordings, tasks, and insights."
- Moving to org-wide shows the visibility warning

## Section 5: AI & Vector Search Integration

### Qdrant upsert paths

When embeddings are created/updated, populate `teamId` in payload:

- Project-scoped content (recordings, transcriptions, summaries, tasks): resolve `teamId` from parent project
- Knowledge base documents with scope="team": use `scopeId` as `teamId`
- Org-wide content (`teamId = null`): omit `teamId` from payload

### Qdrant search filtering

Team filtering in Qdrant requires OR conditions (e.g., "teamId matches OR teamId is absent"). The current `QdrantFilter` type only supports `must` (AND). The following changes are needed:

**Extend `QdrantFilter` type** in `rag/types.ts`:

```typescript
export interface QdrantFilter {
  must?: Array<{ key: string; match?: MatchCondition }>;
  should?: Array<
    { key: string; match?: MatchCondition } | { is_empty: { key: string } }
  >;
  must_not?: Array<{ key: string; match?: MatchCondition }>;
}
```

**Filter construction by context:**

- **Active team set**: `should` clause with two conditions: `teamId` matches active team, OR `teamId` field is empty (org-wide)
- **"All Teams"**: `should` clause with: `teamId` any-match with user's team IDs, OR `teamId` field is empty
- **Org admins**: no team filter (only org filter, as today)

**Extend search option types** — add `teamId` to `RAGSearchOptions` and `HybridSearchOptions`:

```typescript
interface RAGSearchOptions {
  // ... existing fields
  teamId?: string | null; // Active team ID, null for "All"
  userTeamIds?: string[]; // User's team memberships
}

interface HybridSearchOptions {
  // ... existing fields
  teamId?: string | null;
  userTeamIds?: string[];
}
```

The `buildFilter` method in `hybrid-search.service.ts` incorporates these into the Qdrant filter. Important: `buildFilter` must return filters with both `must` and `should` clauses, and all downstream consumers (including `keywordSearch` in `hybrid-search.service.ts`, which currently only spreads `baseFilter.must`) must preserve the `should` clause when constructing their filter objects. Without this, keyword search will silently drop team filtering.

### Affected services

| Service                      | Change                                                           |
| ---------------------------- | ---------------------------------------------------------------- |
| `rag/types.ts`               | Extend `QdrantFilter`, `RAGSearchOptions`, `HybridSearchOptions` |
| `rag.service.ts`             | Add team filter to search options                                |
| `hybrid-search.service.ts`   | Pass `teamId` filter through to Qdrant, update `buildFilter`     |
| `embedding.service.ts`       | Include `teamId` in payload during upsert                        |
| `knowledge-base.service.ts`  | Support `scope="team"` in document indexing                      |
| `chat.service.ts`            | Filter RAG context by team when in project-scoped chat           |
| `summary.service.ts`         | No change — operates on single recording, inherits via project   |
| `task-extraction.service.ts` | No change — same reasoning                                       |

### Backfill

Existing Qdrant points don't have `teamId`. Since all existing resources are org-wide (`teamId = null`), this is consistent — they have no `teamId` field, which matches the "is_empty" filter for org-wide content.

When a project is assigned to a team, update Qdrant payloads for all related points:

1. Filter Qdrant by `projectId` to find all related points
2. Use `setPayload()` to add `teamId` to matching points
3. This runs synchronously in the `updateProject` server action (point count per project is bounded and small enough for synchronous execution)
4. If the Qdrant update fails, log the error but don't roll back the DB change — a background retry can reconcile

## Section 6: Authorization & Edge Cases

### RBAC updates

| Helper               | Change                                                                                   |
| -------------------- | ---------------------------------------------------------------------------------------- |
| `assertTeamAccess()` | New — verifies user is member of resource's team, returns 404 if not. Org admins bypass. |
| `buildTeamFilter()`  | New — returns Drizzle `where` conditions for team-scoped queries                         |
| `canAccessTeam()`    | Already exists — no change needed                                                        |
| `isTeamManager()`    | Already exists — no change needed                                                        |
| `checkPermission()`  | No change — team access checked separately from role permissions                         |

### Server action middleware

Extend `authorizedActionClient` middleware to extract `activeTeamId` and `userTeamIds` from session context and pass through `ctx`. See Section 2 for the specific interface changes.

### Edge cases

1. **User removed from team** — immediate loss of access on next request. Active team resets to "All" if their active team was the one removed from.

2. **Team deleted** — `onDelete: "set null"` makes all resources org-wide. Users see them under "All Teams".

3. **Project moved between teams** — all child recordings, tasks, AI insights, and embeddings inherit the new team scope. Qdrant payloads updated via `setPayload()` (see Section 5 backfill). Chat conversations scoped to that project also move.

4. **Invitation with team assignment** — already supported via `pendingTeamAssignments` table. When accepted, user is added to assigned teams and can immediately see team resources.

5. **Bot sessions / recordings from bots** — bots record into a project. The recording inherits the project's `teamId`. No special handling needed. Bot series subscriptions that create new bot sessions for a project will automatically inherit the project's team scope for any recordings produced.

6. **Org admin switches to a specific team** — sees only that team's resources (same as regular member). On "All Teams", sees everything.

7. **Meeting share tokens** — shared meeting links (via `meeting_share_tokens`) bypass team isolation by design. A share token is an explicit grant of access, similar to a "share link" in Google Docs. The token holder can access the shared content regardless of team membership.
