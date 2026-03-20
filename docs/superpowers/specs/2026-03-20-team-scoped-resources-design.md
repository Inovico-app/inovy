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
- Index on `teamId` for query performance

### Meetings table

Add nullable `teamId` foreign key:

```typescript
teamId: text("team_id").references(() => teams.id, { onDelete: "set null" });
```

- Same `onDelete: "set null"` behavior and indexing as projects

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

- `teamId` column to `projects` table with FK and index
- `teamId` column to `meetings` table with FK and index
- `"team"` value to knowledge base scope enum

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

### Applied at these layers

| Layer               | How                                                      |
| ------------------- | -------------------------------------------------------- |
| `ProjectsQueries`   | Add `teamId` filter to all select queries                |
| `MeetingsQueries`   | Add `teamId` filter to all select queries                |
| `RecordingsQueries` | JOIN through project to check team access                |
| `TasksQueries`      | JOIN through project to check team access                |
| `AI Insights`       | Inherit via recording → project chain                    |
| `ChatConversations` | Project-scoped conversations filtered via project's team |
| `Qdrant searches`   | Add `teamId` must-match filter to all RAG queries        |
| `Knowledge base`    | Filter by scope="team" + scopeId=teamId                  |

### Session extension

Use Better Auth's existing `activeTeamId` on the session to track the user's selected team context. The team switcher calls `setActiveTeam` to update it.

## Section 3: UI — Team Switcher & Navigation

### Team switcher in sidebar

Placed below the existing org switcher. Shows:

- "All Teams" option at the top (sets `activeTeamId = null`)
- User's teams (fetched from `TeamService.getUserTeams()`)
- Active team highlighted with a checkmark

Selecting a team calls Better Auth's `setActiveTeam` API, which updates `activeTeamId` on the session.

### Team hub pages

Enhance existing `/teams/[teamId]` pages:

- `/teams/[teamId]` — dashboard showing team's projects, recent meetings, member count
- `/teams/[teamId]/members` — already built, member management
- `/teams/[teamId]/settings` — already built, team settings

### New: `/teams` index page

Lists all teams the user belongs to as a card grid. Org admins see all teams. Each card shows name, description, member count and links to the team hub.

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

- **Active team set**: add `teamId` must-match filter + include points without `teamId` (org-wide)
- **"All Teams"**: add `teamId` any-match filter with user's team IDs + include points without `teamId`
- **Org admins**: no team filter (only org filter, as today)

### Affected services

| Service                      | Change                                                         |
| ---------------------------- | -------------------------------------------------------------- |
| `rag.service.ts`             | Add team filter to search options                              |
| `hybrid-search.service.ts`   | Pass `teamId` filter through to Qdrant                         |
| `embedding.service.ts`       | Include `teamId` in payload during upsert                      |
| `knowledge-base.service.ts`  | Support `scope="team"` in document indexing                    |
| `chat.service.ts`            | Filter RAG context by team when in project-scoped chat         |
| `summary.service.ts`         | No change — operates on single recording, inherits via project |
| `task-extraction.service.ts` | No change — same reasoning                                     |

### Backfill

Existing Qdrant points don't have `teamId`. Since all existing resources are org-wide (`teamId = null`), this is consistent. When a project is later assigned to a team, a background job updates Qdrant payload for all related points using `setPayload()`.

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

Extend `authorizedActionClient` middleware to extract `activeTeamId` from session and pass through `ctx`. Actions that create/query team-scoped resources use this.

### Edge cases

1. **User removed from team** — immediate loss of access on next request. Active team resets to "All" if their active team was the one removed from.

2. **Team deleted** — `onDelete: "set null"` makes all resources org-wide. Users see them under "All Teams".

3. **Project moved between teams** — all child recordings, tasks, AI insights, and embeddings inherit the new team scope. Qdrant payloads updated via `setPayload()`. Chat conversations scoped to that project also move.

4. **Invitation with team assignment** — already supported via `pendingTeamAssignments` table. When accepted, user is added to assigned teams and can immediately see team resources.

5. **Bot sessions / recordings from bots** — bots record into a project. The recording inherits the project's `teamId`. No special handling needed.

6. **Org admin switches to a specific team** — sees only that team's resources (same as regular member). On "All Teams", sees everything.
