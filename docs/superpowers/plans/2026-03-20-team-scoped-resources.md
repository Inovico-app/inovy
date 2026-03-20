# Team-Scoped Resources Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add team-level resource isolation so projects and meetings can be scoped to teams, with hard isolation (invisible to non-members) and org admin override.

**Architecture:** Add nullable `teamId` FK to projects and meetings tables. Extend session/middleware to carry `activeTeamId` and `userTeamIds`. Build a team isolation query layer (mirroring existing org isolation). Add team switcher UI and team-filtered views. Extend Qdrant filters to support OR conditions for team + org-wide content.

**Tech Stack:** Next.js 16, Better Auth (organization plugin with teams), Drizzle ORM, PostgreSQL, Qdrant, Shadcn UI, Tailwind CSS 4, neverthrow, next-safe-action

**Spec:** `docs/superpowers/specs/2026-03-20-team-scoped-resources-design.md`

---

## File Structure

### New files

| File                                                   | Purpose                                                                  |
| ------------------------------------------------------ | ------------------------------------------------------------------------ |
| `src/lib/rbac/team-isolation.ts`                       | `buildTeamFilter()`, `assertTeamAccess()`, `getTeamContextFromSession()` |
| `src/components/team-switcher.tsx`                     | Team switcher dropdown in sidebar                                        |
| `src/hooks/use-team-switcher.ts`                       | Client hook for team switching logic                                     |
| `src/features/teams/actions/set-active-team.ts`        | Server action to update `activeTeamId` on session                        |
| `src/app/(main)/teams/page.tsx`                        | Teams index page (list all teams)                                        |
| `src/features/teams/components/teams-list.tsx`         | Server component rendering team cards                                    |
| `src/features/teams/components/team-picker.tsx`        | Reusable team picker Select for creation forms                           |
| `src/features/teams/components/visibility-warning.tsx` | Org-wide visibility warning callout                                      |

### Modified files

| File                                                       | Change                                                                         |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `src/server/db/schema/projects.ts`                         | Add `teamId` FK column and composite index                                     |
| `src/server/db/schema/meetings.ts`                         | Add `teamId` FK column and composite index                                     |
| `src/server/db/schema/knowledge-base-entries.ts`           | Add `"team"` to `knowledgeBaseScopeEnum`                                       |
| `src/lib/better-auth-session.ts`                           | Add `activeTeamId`, `userTeamIds` to session data                              |
| `src/lib/server-action-client/action-client.ts`            | Add `activeTeamId`, `userTeamIds` to `ActionContext`                           |
| `src/server/services/rag/types.ts`                         | Extend `QdrantFilter` with `should`/`must_not`, add `teamId` to search options |
| `src/server/services/rag/hybrid-search.service.ts`         | Update `buildFilter()` and `keywordSearch()` to handle `should` clauses        |
| `src/server/services/rag/rag.service.ts`                   | Pass `teamId`/`userTeamIds` through to hybrid search                           |
| `src/server/data-access/projects.queries.ts`               | Add team filtering to select queries, add `teamId` to create                   |
| `src/server/data-access/meetings.queries.ts`               | Add team filtering to select queries                                           |
| `src/server/dto/project.dto.ts`                            | Add `teamId` to `CreateProjectDto` and `ProjectDto`                            |
| `src/features/projects/actions/create-project.ts`          | Accept and pass `teamId`                                                       |
| `src/features/projects/components/create-project-form.tsx` | Add team picker                                                                |
| `src/components/sidebar.tsx`                               | Add `TeamSwitcher` below org switcher                                          |
| `src/lib/navigation.ts`                                    | Add "Teams" nav link                                                           |
| `src/server/services/knowledge-base.service.ts`            | Support `scope="team"`                                                         |
| `src/server/services/chat.service.ts`                      | Pass team context to RAG search                                                |
| `src/server/data-access/recordings.queries.ts`             | Add team filtering via project JOIN                                            |
| `src/server/data-access/tasks.queries.ts`                  | Add team filtering via project JOIN                                            |
| `src/server/services/rag/qdrant.service.ts`                | Ensure `search()`/`scroll()` pass `should`/`must_not` to Qdrant                |

---

## Task 1: Database Schema — Add `teamId` to Projects and Meetings + Generate Migration

> **Important:** Tasks 1-3 from the original plan are merged. The migration MUST be generated after BOTH schema changes are in place.

**Files:**

- Modify: `src/server/db/schema/projects.ts`
- Modify: `src/server/db/schema/meetings.ts`
- Modify: `src/server/dto/project.dto.ts`
- Create: migration file (auto-generated)

- [ ] **Step 1: Add `teamId` column to projects schema**

Full rewrite of `src/server/db/schema/projects.ts` — adds `index` import, `teams` FK import, `teamId` column, and composite index:

```typescript
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { teams } from "./auth";

export const projectStatusEnum = ["active", "archived", "completed"] as const;
export type ProjectStatus = (typeof projectStatusEnum)[number];

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    status: text("status", { enum: projectStatusEnum })
      .notNull()
      .default("active"),
    organizationId: text("organization_id").notNull(),
    teamId: text("team_id").references(() => teams.id, {
      onDelete: "set null",
    }),
    createdById: text("created_by_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    orgTeamIdx: index("projects_organization_team_idx").on(
      table.organizationId,
      table.teamId,
    ),
  }),
);
```

- [ ] **Step 2: Add `teamId` column to meetings schema**

In `src/server/db/schema/meetings.ts`:

- Add `import { teams } from "./auth";` at the top
- Add `teamId: text("team_id").references(() => teams.id, { onDelete: "set null" }),` after `projectId` (line 35)
- Add composite index after the last existing index (before the closing `})` at line 80):

  ```typescript
  orgTeamIdx: index("meetings_organization_team_idx").on(
    table.organizationId,
    table.teamId
  ),
  ```

- [ ] **Step 3: Update project DTOs**

In `src/server/dto/project.dto.ts`, add `teamId: string | null` to `ProjectDto`, `CreateProjectDto`, and `UpdateProjectDto`.

- [ ] **Step 4: Run typecheck**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm run typecheck`

- [ ] **Step 5: Generate migration**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm db:generate --name add_team_id_to_projects_meetings`

Verify the generated SQL contains ALTER TABLE for BOTH projects and meetings, plus CREATE INDEX statements.

- [ ] **Step 6: Commit**

```bash
git add src/server/db/schema/projects.ts src/server/db/schema/meetings.ts src/server/dto/project.dto.ts src/server/db/migrations/
git commit -m "feat(schema): add teamId FK to projects and meetings tables with migration"
```

---

## ~~Task 2: (merged into Task 1)~~

## ~~Task 3: (merged into Task 1)~~

---

## Task 4: Extend Knowledge Base Scope Enum

**Files:**

- Modify: `src/server/db/schema/projects.ts`
- Modify: `src/server/dto/project.dto.ts`

- [ ] **Step 1: Add `teamId` column to projects schema**

In `src/server/db/schema/projects.ts`, add the `teams` import and `teamId` column with FK and composite index:

```typescript
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { teams } from "./auth";

export const projectStatusEnum = ["active", "archived", "completed"] as const;
export type ProjectStatus = (typeof projectStatusEnum)[number];

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    status: text("status", { enum: projectStatusEnum })
      .notNull()
      .default("active"),
    organizationId: text("organization_id").notNull(),
    teamId: text("team_id").references(() => teams.id, {
      onDelete: "set null",
    }),
    createdById: text("created_by_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    orgTeamIdx: index("projects_organization_team_idx").on(
      table.organizationId,
      table.teamId,
    ),
  }),
);
```

- [ ] **Step 2: Update project DTOs**

In `src/server/dto/project.dto.ts`, add `teamId: string | null` to `ProjectDto` and `teamId?: string | null` to `CreateProjectDto`. Find the exact interfaces and add the field.

- [ ] **Step 3: Run typecheck**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm run typecheck`

Fix any type errors caused by the new required field. Since `teamId` is nullable and optional in the schema, existing code should still compile.

- [ ] **Step 4: Commit**

```bash
git add src/server/db/schema/projects.ts src/server/dto/project.dto.ts
git commit -m "feat(schema): add teamId FK to projects table"
```

---

## Task 2: Database Schema — Add `teamId` to Meetings

**Files:**

- Modify: `src/server/db/schema/meetings.ts`

- [ ] **Step 1: Add `teamId` column to meetings schema**

In `src/server/db/schema/meetings.ts`, add `teams` import and `teamId` column after line 35 (`projectId`):

```typescript
teamId: text("team_id").references(() => teams.id, { onDelete: "set null" }),
```

Add import at top:

```typescript
import { teams } from "./auth";
```

Add composite index in the index section (after line 79):

```typescript
orgTeamIdx: index("meetings_organization_team_idx").on(
  table.organizationId,
  table.teamId
),
```

- [ ] **Step 2: Run typecheck**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm run typecheck`

- [ ] **Step 3: Commit**

```bash
git add src/server/db/schema/meetings.ts
git commit -m "feat(schema): add teamId FK to meetings table"
```

---

## Task 3: Generate Database Migration

**Files:**

- Create: `src/server/db/migrations/XXXX_add_team_id_to_projects_meetings.sql` (auto-generated)

- [ ] **Step 1: Generate migration**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm db:generate --name add_team_id_to_projects_meetings`

This generates a SQL migration from the Drizzle schema diff. Verify the generated SQL contains:

- `ALTER TABLE projects ADD COLUMN team_id text REFERENCES teams(id) ON DELETE SET NULL`
- `ALTER TABLE meetings ADD COLUMN team_id text REFERENCES teams(id) ON DELETE SET NULL`
- `CREATE INDEX` statements for the composite indexes

- [ ] **Step 2: Review generated migration file**

Read the generated migration and verify correctness. The migration file will be in `src/server/db/migrations/`.

- [ ] **Step 3: Commit**

```bash
git add src/server/db/migrations/
git commit -m "feat(migration): add team_id columns to projects and meetings"
```

---

## Task 4: Extend Knowledge Base Scope Enum

**Files:**

- Modify: `src/server/db/schema/knowledge-base-entries.ts`

- [ ] **Step 1: Add "team" to scope enum**

In `src/server/db/schema/knowledge-base-entries.ts` line 16-20, add `"team"`:

```typescript
export const knowledgeBaseScopeEnum = [
  "project",
  "organization",
  "global",
  "team",
] as const;
```

This is a code-only change — no migration needed (TypeScript const array, not a Postgres enum).

- [ ] **Step 2: Run typecheck**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm run typecheck`

- [ ] **Step 3: Commit**

```bash
git add src/server/db/schema/knowledge-base-entries.ts
git commit -m "feat(schema): add team scope to knowledge base entries"
```

---

## Task 5: Extend Session with Team Context

**Files:**

- Modify: `src/lib/better-auth-session.ts`

- [ ] **Step 1: Add `activeTeamId` and `userTeamIds` to `BetterAuthSessionData`**

In `src/lib/better-auth-session.ts` lines 20-25, extend the interface:

```typescript
export interface BetterAuthSessionData {
  isAuthenticated: boolean;
  user: BetterAuthUser | null;
  organization: BetterAuthOrganization | null;
  member: BetterAuthMember | null;
  activeTeamId: string | null;
  userTeamIds: string[];
}
```

- [ ] **Step 2: Add team context resolution to `fetchAndBuildSession()`**

Add a Drizzle import and team query. At the top of the file, add:

```typescript
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import {
  teamMembers,
  sessions as sessionsTable,
} from "@/server/db/schema/auth";
```

After `const activeMember = activeMemberResult ?? null;` (around line 121), add:

```typescript
// Resolve active team and user's team memberships
let activeTeamId: string | null = null;
let userTeamIds: string[] = [];

if (session.user) {
  // Get activeTeamId from session - try raw session data first
  const rawSession = session.session as
    | { activeTeamId?: string | null }
    | undefined;
  activeTeamId = rawSession?.activeTeamId ?? null;

  // If not available from session object, query directly
  if (activeTeamId === undefined || activeTeamId === null) {
    try {
      const sessionRecord = await db
        .select({ activeTeamId: sessionsTable.activeTeamId })
        .from(sessionsTable)
        .where(eq(sessionsTable.id, session.session.id))
        .limit(1);
      activeTeamId = sessionRecord[0]?.activeTeamId ?? null;
    } catch {
      activeTeamId = null;
    }
  }

  // Get user's team memberships
  try {
    const memberships = await db
      .select({ teamId: teamMembers.teamId })
      .from(teamMembers)
      .where(eq(teamMembers.userId, session.user.id));
    userTeamIds = memberships.map((m) => m.teamId);
  } catch {
    userTeamIds = [];
  }
}
```

- [ ] **Step 3: Update the return value**

In the `return ok({...})` block (around line 134), add the two new fields:

```typescript
return ok({
  isAuthenticated: true,
  user: { ... },
  organization: activeOrganization,
  member: activeMember ? { ... } : null,
  activeTeamId,
  userTeamIds,
});
```

Also update the unauthenticated return (around line 98):

```typescript
return ok({
  isAuthenticated: false,
  user: null,
  organization: null,
  member: null,
  activeTeamId: null,
  userTeamIds: [],
});
```

- [ ] **Step 4: Run typecheck**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm run typecheck`

Fix any errors from consumers that destructure `BetterAuthSessionData` — they'll now need to handle the new fields.

- [ ] **Step 5: Commit**

```bash
git add src/lib/better-auth-session.ts
git commit -m "feat(auth): add activeTeamId and userTeamIds to session data"
```

---

## Task 6: Extend Action Client Middleware with Team Context

**Files:**

- Modify: `src/lib/server-action-client/action-client.ts`

- [ ] **Step 1: Add team fields to `ActionContext`**

In `src/lib/server-action-client/action-client.ts` lines 41-46, extend:

```typescript
export interface ActionContext {
  logger: typeof logger;
  session?: SessionWithRoles;
  user?: BetterAuthUser;
  organizationId?: string;
  activeTeamId?: string | null;
  userTeamIds?: string[];
}
```

- [ ] **Step 2: Pass team context in middleware return**

In the `authenticationMiddleware` function, update the `return next({...})` block (lines 204-211):

```typescript
return next({
  ctx: {
    ...ctx,
    session,
    user,
    organizationId: organization?.id,
    activeTeamId: session.value.activeTeamId,
    userTeamIds: session.value.userTeamIds,
  },
});
```

- [ ] **Step 3: Run typecheck**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm run typecheck`

- [ ] **Step 4: Commit**

```bash
git add src/lib/server-action-client/action-client.ts
git commit -m "feat(middleware): pass activeTeamId and userTeamIds through action context"
```

---

## Task 7: Create Team Isolation Helpers

**Files:**

- Create: `src/lib/rbac/team-isolation.ts`

- [ ] **Step 1: Create the team isolation module**

Create `src/lib/rbac/team-isolation.ts` with `buildTeamFilter`, `assertTeamAccess`, and `getTeamContextFromSession`:

```typescript
/**
 * Team Isolation Utilities
 * Provides centralized helpers for enforcing team-level data isolation.
 * Mirrors the organization-isolation.ts pattern.
 */

import type { Column, SQL } from "drizzle-orm";
import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { logger } from "../logger";
import { ActionErrors } from "../server-action-client/action-errors";
import { isOrganizationAdmin } from "./rbac";
import type { BetterAuthUser } from "../auth";

/**
 * Build Drizzle WHERE conditions for team-scoped queries.
 *
 * Logic:
 * - Org admin: no team filter (sees everything in org)
 * - Active team set: teamId = activeTeamId
 * - "All Teams" (null): teamId IN userTeamIds OR teamId IS NULL
 */
export function buildTeamFilter(
  teamIdColumn: Column,
  activeTeamId: string | null | undefined,
  userTeamIds: string[],
  user: BetterAuthUser,
): SQL | undefined {
  // Org admins bypass team filtering
  if (isOrganizationAdmin(user)) {
    return undefined;
  }

  // Active team selected — show that team's resources + org-wide
  if (activeTeamId) {
    return or(eq(teamIdColumn, activeTeamId), isNull(teamIdColumn));
  }

  // "All Teams" — show user's teams + org-wide
  if (userTeamIds.length > 0) {
    return or(inArray(teamIdColumn, userTeamIds), isNull(teamIdColumn));
  }

  // User has no teams — only org-wide resources
  return isNull(teamIdColumn);
}

/**
 * Assert that a user can access a resource's team.
 * Returns 404 (not 403) to prevent information leakage.
 * Org admins always pass.
 *
 * @param resourceTeamId - The team ID on the resource (null = org-wide)
 * @param userTeamIds - The user's team memberships
 * @param user - The authenticated user
 * @param context - Logging context
 */
export function assertTeamAccess(
  resourceTeamId: string | null | undefined,
  userTeamIds: string[],
  user: BetterAuthUser,
  context?: string,
): void {
  // Org-wide resources are accessible to all org members
  if (!resourceTeamId) {
    return;
  }

  // Org admins bypass team checks
  if (isOrganizationAdmin(user)) {
    return;
  }

  // Check if user is a member of the resource's team
  if (userTeamIds.includes(resourceTeamId)) {
    return;
  }

  logger.warn("Team access denied", {
    component: context ?? "assertTeamAccess",
    resourceTeamId,
    userTeamIds,
    reason: "User is not a member of the resource's team",
  });

  // Return 404 to prevent information leakage
  throw ActionErrors.notFound(
    "Resource not found",
    context ?? "assertTeamAccess",
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm run typecheck`

- [ ] **Step 3: Commit**

```bash
git add src/lib/rbac/team-isolation.ts
git commit -m "feat(rbac): add team isolation helpers (buildTeamFilter, assertTeamAccess)"
```

---

## Task 8: Add Team Filtering to Project Queries

**Files:**

- Modify: `src/server/data-access/projects.queries.ts`

- [ ] **Step 1: Add team filtering to project select queries**

Import the team filter helper and the `projects` schema's new `teamId`:

```typescript
import { buildTeamFilter } from "@/lib/rbac/team-isolation";
import type { BetterAuthUser } from "@/lib/auth";
```

For list queries (like finding all projects for an org), add a `teamFilter` parameter. For example, update `findByOrganization` or equivalent methods to accept team context:

```typescript
static async findByOrganization(
  organizationId: string,
  options?: {
    activeTeamId?: string | null;
    userTeamIds?: string[];
    user?: BetterAuthUser;
    status?: AllowedStatus;
  }
): Promise<ProjectWithRecordingCountDto[]> {
  const conditions = [eq(projects.organizationId, organizationId)];

  // Apply team filter if user context provided
  if (options?.user && options?.userTeamIds) {
    const teamFilter = buildTeamFilter(
      projects.teamId,
      options.activeTeamId,
      options.userTeamIds,
      options.user
    );
    if (teamFilter) {
      conditions.push(teamFilter);
    }
  }

  // ... rest of query with and(...conditions)
}
```

- [ ] **Step 2: Add `teamId` to project creation**

In the `create()` method, add `teamId` to the insert values:

```typescript
static async create(data: CreateProjectDto): Promise<ProjectDto> {
  return await db.transaction(async (tx) => {
    const [project] = await tx
      .insert(projects)
      .values({
        name: data.name,
        description: data.description || null,
        status: "active",
        organizationId: data.organizationId,
        teamId: data.teamId ?? null,
        createdById: data.createdById,
      })
      .returning();
    // ... return with teamId
  });
}
```

- [ ] **Step 3: Add `teamId` to project DTOs returned**

Ensure all query return types include `teamId`. Update the select fields and return mappings.

- [ ] **Step 4: Run typecheck**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm run typecheck`

- [ ] **Step 5: Commit**

```bash
git add src/server/data-access/projects.queries.ts src/server/dto/project.dto.ts
git commit -m "feat(queries): add team filtering and teamId support to project queries"
```

---

## Task 9: Add Team Filtering to Meeting Queries

**Files:**

- Modify: `src/server/data-access/meetings.queries.ts`

- [ ] **Step 1: Add team filtering to meeting select queries**

Same pattern as Task 8. Import `buildTeamFilter` and add team filter conditions to methods like `findById`, `findUpcoming`, `findByOrganization`, etc.

Key meeting methods that need team filtering:

- `findById` — after org check, also check team access
- `findUpcoming` — add team filter to conditions
- `findByOrganization` — add team filter to conditions
- Any other list methods

- [ ] **Step 2: Run typecheck**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm run typecheck`

- [ ] **Step 3: Commit**

```bash
git add src/server/data-access/meetings.queries.ts
git commit -m "feat(queries): add team filtering to meeting queries"
```

---

## Task 10: Extend Qdrant Filter Types

**Files:**

- Modify: `src/server/services/rag/types.ts`

- [ ] **Step 1: Extend `QdrantFilter` with `should` and `must_not`**

In `src/server/services/rag/types.ts` lines 36-41, update:

```typescript
export interface QdrantFilter {
  must?: Array<{
    key: string;
    match?: MatchCondition;
  }>;
  should?: Array<
    { key: string; match?: MatchCondition } | { is_empty: { key: string } }
  >;
  must_not?: Array<{
    key: string;
    match?: MatchCondition;
  }>;
}
```

- [ ] **Step 2: Add `teamId` and `userTeamIds` to search option interfaces**

In `RAGSearchOptions` (lines 144-154), add:

```typescript
teamId?: string | null;
userTeamIds?: string[];
```

In `HybridSearchOptions` (lines 157-167), add:

```typescript
teamId?: string | null;
userTeamIds?: string[];
```

- [ ] **Step 3: Run typecheck**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm run typecheck`

- [ ] **Step 4: Commit**

```bash
git add src/server/services/rag/types.ts
git commit -m "feat(rag): extend QdrantFilter with should/must_not and add teamId to search options"
```

---

## Task 11: Update Hybrid Search Filter Builder

**Files:**

- Modify: `src/server/services/rag/hybrid-search.service.ts`

- [ ] **Step 1: Update `buildFilter` method signature and logic**

In `src/server/services/rag/hybrid-search.service.ts`, update the `buildFilter` method (lines 340-391) to accept and handle team context:

```typescript
private buildFilter(
  userId: string | undefined,
  organizationId: string | undefined,
  projectId: string | undefined,
  additionalFilters: Record<string, unknown>,
  teamId?: string | null,
  userTeamIds?: string[]
): QdrantFilter {
  const must: Array<{ key: string; match?: MatchCondition }> = [];
  const should: Array<
    | { key: string; match?: MatchCondition }
    | { is_empty: { key: string } }
  > = [];

  // ... existing must conditions for userId, organizationId, projectId ...

  // Team filtering — uses should (OR) for team + org-wide
  if (teamId) {
    // Active team: show team's content + org-wide (no teamId)
    should.push({ key: "teamId", match: { value: teamId } });
    should.push({ is_empty: { key: "teamId" } });
  } else if (userTeamIds && userTeamIds.length > 0) {
    // "All Teams": show user's teams + org-wide
    should.push({ key: "teamId", match: { any: userTeamIds } });
    should.push({ is_empty: { key: "teamId" } });
  }
  // If no team context and no userTeamIds, no team filter applied (org admin path)

  const filter: QdrantFilter = {};
  if (must.length > 0) filter.must = must;
  if (should.length > 0) filter.should = should;
  return filter;
}
```

- [ ] **Step 2: Update callers of `buildFilter`**

In the `search()` method (around line 85), pass `teamId` and `userTeamIds`:

```typescript
const filter = this.buildFilter(
  userId,
  organizationId,
  projectId,
  filters ?? {},
  options.teamId,
  options.userTeamIds,
);
```

- [ ] **Step 3: Update `keywordSearch` to preserve `should` clause**

Find the `keywordSearch` method. Where it spreads `baseFilter.must`, also spread `should`:

```typescript
const filter: QdrantFilter = {
  must: [
    ...(baseFilter.must ?? []),
    { key: "content", match: { text: query } },
  ],
  ...(baseFilter.should ? { should: baseFilter.should } : {}),
};
```

- [ ] **Step 4: Run typecheck**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm run typecheck`

- [ ] **Step 5: Commit**

```bash
git add src/server/services/rag/hybrid-search.service.ts
git commit -m "feat(rag): add team filtering to hybrid search with should-clause support"
```

---

## Task 12: Pass Team Context Through RAG and Chat Services

**Files:**

- Modify: `src/server/services/rag/rag.service.ts`
- Modify: `src/server/services/chat.service.ts`

- [ ] **Step 1: Update RAG service to pass team context**

In `src/server/services/rag/rag.service.ts`, in the `search()` method (around line 68), extract and pass `teamId`/`userTeamIds` from options to the hybrid search engine.

- [ ] **Step 2: Update chat service to include team context in RAG queries**

In `src/server/services/chat.service.ts`, when calling `ragService.search()`, pass the team context from the session (the caller should provide it).

- [ ] **Step 3: Run typecheck**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm run typecheck`

- [ ] **Step 4: Commit**

```bash
git add src/server/services/rag/rag.service.ts src/server/services/chat.service.ts
git commit -m "feat(rag): pass team context through RAG and chat services"
```

---

## Task 13: Create Set Active Team Server Action

**Files:**

- Create: `src/features/teams/actions/set-active-team.ts`

- [ ] **Step 1: Create the server action**

```typescript
"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  authorizedActionClient,
  resultToActionResponse,
} from "@/lib/server-action-client/action-client";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { sessions } from "@/server/db/schema/auth";
import { ok, err } from "neverthrow";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { isOrganizationAdmin } from "@/lib/rbac/rbac";

const setActiveTeamSchema = z.object({
  teamId: z.string().nullable(),
});

export const setActiveTeamAction = authorizedActionClient
  .metadata({ permissions: {} })
  .inputSchema(setActiveTeamSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { teamId } = parsedInput;
    const { user, userTeamIds } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated("User not found", "set-active-team");
    }

    // Validate team membership (if setting to a specific team)
    if (teamId && !userTeamIds?.includes(teamId)) {
      if (!isOrganizationAdmin(user)) {
        throw ActionErrors.forbidden(
          "Not a member of this team",
          undefined,
          "set-active-team",
        );
      }
    }

    // Get current session ID from Better Auth
    try {
      const requestHeaders = await headers();
      const currentSession = await auth.api.getSession({
        headers: requestHeaders,
      });

      if (!currentSession?.session?.id) {
        return resultToActionResponse(
          err(
            ActionErrors.internal(
              "No active session",
              undefined,
              "set-active-team",
            ),
          ),
        );
      }

      // Update activeTeamId directly on the session record via Drizzle
      await db
        .update(sessions)
        .set({ activeTeamId: teamId })
        .where(eq(sessions.id, currentSession.session.id));
    } catch (error) {
      return resultToActionResponse(
        err(
          ActionErrors.internal(
            "Failed to update active team",
            error as Error,
            "set-active-team",
          ),
        ),
      );
    }

    revalidatePath("/");
    return resultToActionResponse(ok({ teamId }));
  });
```

- [ ] **Step 2: Run typecheck**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm run typecheck`

- [ ] **Step 3: Commit**

```bash
git add src/features/teams/actions/set-active-team.ts
git commit -m "feat(teams): add setActiveTeam server action"
```

---

## Task 14: Create Team Switcher Hook

**Files:**

- Create: `src/hooks/use-team-switcher.ts`

- [ ] **Step 1: Create the hook**

```typescript
"use client";

import { useAction } from "next-safe-action/hooks";
import { setActiveTeamAction } from "@/features/teams/actions/set-active-team";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function useTeamSwitcher() {
  const router = useRouter();

  const { execute, isExecuting } = useAction(setActiveTeamAction, {
    onSuccess: () => {
      router.refresh();
    },
    onError: ({ error }) => {
      toast.error(error.serverError || "Failed to switch team");
    },
  });

  const switchTeam = (teamId: string | null) => {
    execute({ teamId });
  };

  return {
    switchTeam,
    isSwitching: isExecuting,
  };
}
```

- [ ] **Step 2: Run typecheck**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm run typecheck`

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-team-switcher.ts
git commit -m "feat(hooks): add useTeamSwitcher hook"
```

---

## Task 15: Create Team Switcher UI Component

**Files:**

- Create: `src/components/team-switcher.tsx`

- [ ] **Step 1: Create the team switcher component**

Follow the pattern from `src/components/organization-switcher.tsx`. The component should:

- Accept `collapsed` prop (same as org switcher)
- Show "All Teams" option + user's teams
- Highlight active team with checkmark
- Use `useTeamSwitcher` hook for switching
- Fetch teams from a server component or via the session

Reference `src/components/organization-switcher.tsx` for the exact UI pattern (dropdown with avatars, labels, checkmarks).

The component needs team data. Since the sidebar is a client component, fetch teams via a server action or pass them from the parent layout. The simplest approach: create a server component wrapper that fetches teams and passes them as props.

- [ ] **Step 2: Run typecheck and lint**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm run typecheck && pnpm lint`

- [ ] **Step 3: Commit**

```bash
git add src/components/team-switcher.tsx
git commit -m "feat(ui): add TeamSwitcher sidebar component"
```

---

## Task 16: Add Team Switcher to Sidebar + Teams Nav Link

**Files:**

- Modify: `src/components/sidebar.tsx`
- Modify: `src/lib/navigation.ts`

- [ ] **Step 1: Add Teams link to navigation**

In `src/lib/navigation.ts`, add import and nav link:

```typescript
import { Users } from "lucide-react";
```

Add to `navLinks` array before Settings:

```typescript
{ to: "/teams", label: "Teams", icon: Users },
```

- [ ] **Step 2: Add TeamSwitcher to sidebar**

In `src/components/sidebar.tsx`, import and render:

```typescript
import { TeamSwitcher } from "@/components/team-switcher";
```

After line 101 (`<OrganizationSwitcher collapsed={collapsed} />`), add:

```tsx
<TeamSwitcher collapsed={collapsed} />
```

- [ ] **Step 3: Run typecheck and lint**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm run typecheck && pnpm lint`

- [ ] **Step 4: Commit**

```bash
git add src/components/sidebar.tsx src/lib/navigation.ts
git commit -m "feat(ui): add team switcher to sidebar and Teams nav link"
```

---

## Task 17: Create Teams Index Page

**Files:**

- Create: `src/app/(main)/teams/page.tsx`
- Create: `src/features/teams/components/teams-list.tsx`

- [ ] **Step 1: Create teams list server component**

Create `src/features/teams/components/teams-list.tsx` (this is a React Server Component — do NOT add `"use server"`, which is only for Server Actions):

```typescript
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getBetterAuthSession } from "@/lib/better-auth-session";
import { isOrganizationAdmin } from "@/lib/rbac/rbac";
import { TeamService } from "@/server/services/team.service";
import { UsersIcon } from "lucide-react";
import Link from "next/link";

export async function TeamsList() {
  const authResult = await getBetterAuthSession();

  if (
    authResult.isErr() ||
    !authResult.value.isAuthenticated ||
    !authResult.value.organization ||
    !authResult.value.user
  ) {
    return (
      <p className="text-muted-foreground text-center py-8">
        Unable to load teams. Please refresh.
      </p>
    );
  }

  const { user, organization } = authResult.value;
  const isAdmin = isOrganizationAdmin(user);

  // Org admins see all teams, regular users see their teams
  const teamsResult = await TeamService.getTeamsByOrganization(organization.id);
  const allTeams = teamsResult.isOk() ? teamsResult.value : [];

  // Filter to user's teams if not admin
  const userTeamsResult = isAdmin
    ? { isOk: () => true, value: [] }
    : await TeamService.getUserTeams(user.id);
  const userTeamIds = new Set(
    isAdmin
      ? allTeams.map((t) => t.id)
      : (userTeamsResult as { value: Array<{ teamId: string }> }).value?.map(
          (t) => t.teamId
        ) ?? []
  );

  const visibleTeams = allTeams.filter((t) => userTeamIds.has(t.id));

  if (visibleTeams.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-8">
        You are not a member of any teams yet.
      </p>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {visibleTeams.map((team) => (
        <Link key={team.id} href={`/teams/${team.id}`}>
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg">{team.name}</CardTitle>
              {isAdmin && (
                <Badge variant="outline" className="w-fit">
                  Admin
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <UsersIcon className="h-4 w-4" />
                <span>Team</span>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create teams index page**

Create `src/app/(main)/teams/page.tsx`:

```typescript
import type { Metadata } from "next";
import { Skeleton } from "@/components/ui/skeleton";
import { TeamsList } from "@/features/teams/components/teams-list";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Teams",
};

export default function TeamsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Teams</h1>
        <p className="text-muted-foreground">
          View and manage your team memberships
        </p>
      </div>

      <Suspense
        fallback={
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={`skeleton-${i}`} className="h-32" />
            ))}
          </div>
        }
      >
        <TeamsList />
      </Suspense>
    </div>
  );
}
```

- [ ] **Step 3: Run typecheck and lint**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm run typecheck && pnpm lint`

- [ ] **Step 4: Commit**

```bash
git add src/app/(main)/teams/page.tsx src/features/teams/components/teams-list.tsx
git commit -m "feat(ui): add teams index page with team card grid"
```

---

## Task 18: Create Team Picker and Visibility Warning Components

**Files:**

- Create: `src/features/teams/components/team-picker.tsx`
- Create: `src/features/teams/components/visibility-warning.tsx`

- [ ] **Step 1: Create visibility warning component**

```typescript
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EyeIcon } from "lucide-react";

interface VisibilityWarningProps {
  teamName?: string;
}

export function VisibilityWarning({ teamName }: VisibilityWarningProps) {
  if (teamName) {
    return (
      <Alert>
        <EyeIcon className="h-4 w-4" />
        <AlertDescription>
          This will be visible to <strong>{teamName}</strong> members only.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant="destructive">
      <EyeIcon className="h-4 w-4" />
      <AlertDescription>
        This will be visible to <strong>all members</strong> of your
        organization.
      </AlertDescription>
    </Alert>
  );
}
```

- [ ] **Step 2: Create team picker component**

```typescript
"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { VisibilityWarning } from "./visibility-warning";

interface TeamOption {
  id: string;
  name: string;
}

interface TeamPickerProps {
  teams: TeamOption[];
  value: string | null;
  onChange: (teamId: string | null) => void;
  activeTeamId?: string | null;
}

export function TeamPicker({
  teams,
  value,
  onChange,
  activeTeamId,
}: TeamPickerProps) {
  // If active team is set, don't show picker (auto-assigned)
  if (activeTeamId) {
    const teamName = teams.find((t) => t.id === activeTeamId)?.name;
    return <VisibilityWarning teamName={teamName} />;
  }

  const selectedTeam = value ? teams.find((t) => t.id === value) : null;

  return (
    <div className="space-y-2">
      <Label htmlFor="team-select">Team</Label>
      <Select
        value={value ?? "org-wide"}
        onValueChange={(v) => onChange(v === "org-wide" ? null : v)}
      >
        <SelectTrigger id="team-select">
          <SelectValue placeholder="Select a team" />
        </SelectTrigger>
        <SelectContent>
          {teams.map((team) => (
            <SelectItem key={team.id} value={team.id}>
              {team.name}
            </SelectItem>
          ))}
          <SelectItem value="org-wide">Org-wide</SelectItem>
        </SelectContent>
      </Select>

      <VisibilityWarning teamName={selectedTeam?.name} />
    </div>
  );
}
```

- [ ] **Step 3: Run typecheck and lint**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm run typecheck && pnpm lint`

- [ ] **Step 4: Commit**

```bash
git add src/features/teams/components/team-picker.tsx src/features/teams/components/visibility-warning.tsx
git commit -m "feat(ui): add TeamPicker and VisibilityWarning components"
```

---

## Task 19: Update Project Creation with Team Support

**Files:**

- Modify: `src/features/projects/actions/create-project.ts`
- Modify: `src/server/validation/projects/create-project.ts`
- Modify: `src/features/projects/components/create-project-form.tsx`
- Modify: `src/server/services/project.service.ts`

- [ ] **Step 1: Add `teamId` to create project validation schema**

In `src/server/validation/projects/create-project.ts`, add:

```typescript
teamId: z.string().uuid().nullable().optional(),
```

- [ ] **Step 2: Update project service to accept `teamId`**

In `src/server/services/project.service.ts`, update `createProject()` to accept and pass `teamId` to `ProjectQueries.create()`. Also validate team membership: if `teamId` is provided, verify the user is a member (or is org admin).

- [ ] **Step 3: Update create project action**

In `src/features/projects/actions/create-project.ts`, extract `teamId` from `parsedInput` and pass to `ProjectService.createProject()`. If `ctx.activeTeamId` is set and no explicit `teamId` in input, use `ctx.activeTeamId`:

```typescript
const teamId = parsedInput.teamId ?? ctx.activeTeamId ?? null;
```

- [ ] **Step 4: Update creation form with team picker**

In `src/features/projects/components/create-project-form.tsx`, add the `TeamPicker` component. It needs `activeTeamId` and `userTeams` as props. Pass the selected team ID in the form submission.

- [ ] **Step 5: Run typecheck and lint**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm run typecheck && pnpm lint`

- [ ] **Step 6: Commit**

```bash
git add src/features/projects/actions/create-project.ts src/server/validation/projects/create-project.ts src/features/projects/components/create-project-form.tsx src/server/services/project.service.ts
git commit -m "feat(projects): add teamId support to project creation flow"
```

---

## Task 20: Update Embedding Upsert with Team Context

**Files:**

- Modify: `src/server/services/rag/rag.service.ts` — `addDocument()` and batch indexing methods construct Qdrant payloads
- Modify: `src/server/services/document.service.ts` — already has `teamId: metadata.teamId` at line 787, but callers may not provide it
- Verify: `src/server/services/document-processing.service.ts` — processes uploaded documents, should pass `teamId`

Note: `src/server/services/embedding.service.ts` generates vector embeddings (math), NOT Qdrant payloads. The payload construction happens in `rag.service.ts` and `document.service.ts`.

- [ ] **Step 1: Update `rag.service.ts` payload construction**

In `addDocument()` and any batch indexing methods in `rag.service.ts`, ensure the Qdrant payload includes `teamId` resolved from the parent project:

```typescript
payload: {
  ...existingPayload,
  teamId: project.teamId ? [project.teamId] : undefined,
}
```

`QdrantPayload.teamId` is `string[]`, so wrap the single team ID in an array.

- [ ] **Step 2: Verify `document.service.ts` callers provide teamId**

`document.service.ts` line 787 already passes `teamId: metadata.teamId`. Verify that callers (recording processing, knowledge base indexing, etc.) resolve and include the project's `teamId` when constructing the metadata passed to `document.service.ts`.

- [ ] **Step 3: Run typecheck**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm run typecheck`

- [ ] **Step 4: Commit**

```bash
git add src/server/services/rag/rag.service.ts src/server/services/document.service.ts
git commit -m "feat(embeddings): include teamId in Qdrant payload during upsert"
```

---

## Task 21: Add Qdrant Backfill on Project Team Change

**Files:**

- Modify: `src/server/services/project.service.ts` (or the update project action)

- [ ] **Step 1: Add Qdrant payload update when project's teamId changes**

When a project's `teamId` is updated (via the update action), update Qdrant payloads for all points associated with that project:

```typescript
// After DB update succeeds:
if (data.teamId !== undefined) {
  const qdrant = QdrantClientService.getInstance();
  const newTeamPayload = data.teamId
    ? { teamId: [data.teamId] }
    : { teamId: [] };

  await qdrant
    .setPayload(newTeamPayload, {
      must: [{ key: "projectId", match: { value: projectId } }],
    })
    .catch((error) => {
      logger.error("Failed to update Qdrant teamId for project", {
        projectId,
        teamId: data.teamId,
        error,
      });
      // Don't fail the request — log for background reconciliation
    });
}
```

- [ ] **Step 2: Run typecheck**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm run typecheck`

- [ ] **Step 3: Commit**

```bash
git add src/server/services/project.service.ts
git commit -m "feat(qdrant): backfill teamId in Qdrant when project team changes"
```

---

## Task 22: Wire Team Context Through Project and Meeting Pages

**Files:**

- Modify: `src/app/(main)/projects/page.tsx` (or the server component that fetches projects)
- Modify: `src/app/(main)/meetings/page.tsx` (or equivalent)
- Modify: `src/app/(main)/page.tsx` (dashboard)

- [ ] **Step 1: Update project list page**

Pass `activeTeamId`, `userTeamIds`, and `user` from the session to `ProjectQueries`:

```typescript
const authResult = await getBetterAuthSession();
const { user, activeTeamId, userTeamIds } = authResult.value;

const projects = await ProjectQueries.findByOrganization(organizationId, {
  activeTeamId,
  userTeamIds,
  user,
});
```

- [ ] **Step 2: Update meetings list page**

Same pattern — pass team context to `MeetingsQueries` methods.

- [ ] **Step 3: Update dashboard**

Dashboard shows recent projects/meetings — apply team filtering there too.

- [ ] **Step 4: Run typecheck**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm run typecheck`

- [ ] **Step 5: Commit**

```bash
git add src/app/(main)/projects/ src/app/(main)/meetings/ src/app/(main)/page.tsx
git commit -m "feat(pages): wire team context through project and meeting pages"
```

---

## Task 22b: Add Team Filtering to Recordings and Tasks Queries

**Files:**

- Modify: `src/server/data-access/recordings.queries.ts`
- Modify: `src/server/data-access/tasks.queries.ts`

Recordings and tasks inherit team scope from their parent project via JOIN.

- [ ] **Step 1: Add team filtering to recordings queries**

In `src/server/data-access/recordings.queries.ts`, for list queries (e.g., `selectRecordingsByProjectId`, `selectRecordingsByOrganization`), JOIN through `projects` to check team access:

```typescript
import { buildTeamFilter } from "@/lib/rbac/team-isolation";
import { projects } from "../db/schema/projects";

// In list queries, add a join + team filter:
.innerJoin(projects, eq(recordings.projectId, projects.id))
// Then add to conditions:
const teamFilter = buildTeamFilter(projects.teamId, activeTeamId, userTeamIds, user);
if (teamFilter) conditions.push(teamFilter);
```

- [ ] **Step 2: Add team filtering to tasks queries**

In `src/server/data-access/tasks.queries.ts`, the `getTasksByOrganization()` method (line 53) already accepts `teamIds` in its filter options. Verify this is wired correctly and update if needed to use the `buildTeamFilter` helper via project JOIN.

- [ ] **Step 3: Wire recordings and tasks pages**

Update the recordings list page (`src/app/(main)/recordings/`) and tasks list page (`src/app/(main)/tasks/`) to pass team context from the session.

- [ ] **Step 4: Run typecheck**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm run typecheck`

- [ ] **Step 5: Commit**

```bash
git add src/server/data-access/recordings.queries.ts src/server/data-access/tasks.queries.ts src/app/(main)/recordings/ src/app/(main)/tasks/
git commit -m "feat(queries): add team filtering to recordings and tasks via project JOIN"
```

---

## Task 23: Enhance Team Hub Dashboard

**Files:**

- Modify: `src/features/teams/components/team-dashboard.tsx`

- [ ] **Step 1: Update team dashboard to show team's projects and meetings**

The existing `team-dashboard.tsx` shows member stats. Enhance it to also show:

- Team's projects (query with `teamId` filter)
- Recent team meetings
- Quick links to filtered views

Use `ProjectQueries` and `MeetingsQueries` with the team's ID as the active team filter.

- [ ] **Step 2: Run typecheck and lint**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm run typecheck && pnpm lint`

- [ ] **Step 3: Commit**

```bash
git add src/features/teams/components/team-dashboard.tsx
git commit -m "feat(teams): enhance team dashboard with projects and meetings"
```

---

## Task 24: Full Build Verification and Cleanup

- [ ] **Step 1: Run full lint**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm lint`

Fix any new warnings. Aim to not increase the existing warning count.

- [ ] **Step 2: Run full typecheck**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm run typecheck`

- [ ] **Step 3: Run full build**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm run build`

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: cleanup and fix lint/type issues from team scoping feature"
```

---

## Task 25: Add Team Support to Meeting Creation

**Files:**

- Modify: `src/server/validation/meetings/` (find the create meeting validation schema)
- Modify: `src/server/services/meeting.service.ts` (or equivalent)
- Modify: `src/features/meetings/actions/` (find the create meeting action)
- Modify: `src/features/meetings/components/` (find the create meeting form)

- [ ] **Step 1: Add `teamId` to meeting creation validation schema**

Add `teamId: z.string().nullable().optional()` to the create meeting schema.

- [ ] **Step 2: Update meeting service to accept and pass `teamId`**

Same pattern as project creation (Task 19). Validate team membership if `teamId` is provided.

- [ ] **Step 3: Update create meeting action**

Extract `teamId` from input, default to `ctx.activeTeamId`:

```typescript
const teamId = parsedInput.teamId ?? ctx.activeTeamId ?? null;
```

- [ ] **Step 4: Add team picker to meeting creation form**

Add the `TeamPicker` component to the meeting creation form, same pattern as project creation.

- [ ] **Step 5: Run typecheck and lint**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm run typecheck && pnpm lint`

- [ ] **Step 6: Commit**

```bash
git add src/server/validation/ src/server/services/ src/features/meetings/
git commit -m "feat(meetings): add teamId support to meeting creation flow"
```

---

## Task 26: Add Project/Meeting Team Reassignment

**Files:**

- Modify: `src/server/services/project.service.ts` — update method to accept `teamId` changes
- Modify: `src/features/projects/components/` — project settings form
- Modify: `src/features/teams/components/visibility-warning.tsx` — add move confirmation variant

- [ ] **Step 1: Ensure `UpdateProjectDto` includes `teamId`**

Already added in Task 1 Step 3. Verify `UpdateProjectDto` has `teamId?: string | null`.

- [ ] **Step 2: Update project settings form with team field**

Add a team `Select` to the project settings form. When changing teams, show confirmation dialog:

- "Members of [Old Team] will lose access to this project and all its recordings, tasks, and insights."

- [ ] **Step 3: Add meeting/project team consistency warning**

When linking a meeting to a project where teams differ, show a warning:

- "This meeting belongs to [Team A] but the project belongs to [Team B]. Recordings will be visible to [Team B] members."

- [ ] **Step 4: Run typecheck and lint**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm run typecheck && pnpm lint`

- [ ] **Step 5: Commit**

```bash
git add src/server/services/project.service.ts src/features/projects/ src/features/teams/
git commit -m "feat(projects): add team reassignment with confirmation warnings"
```

---

## Task 27: Add Knowledge Base Team Scope Support

**Files:**

- Modify: `src/server/services/knowledge-base.service.ts`
- Modify: `src/server/services/knowledge-base-browser.service.ts` (if it exists and handles scope filtering)
- Modify: `src/server/data-access/knowledge-base-entries.queries.ts`

- [ ] **Step 1: Update knowledge base service to handle scope="team"**

In `src/server/services/knowledge-base.service.ts`, the `getApplicableKnowledge()` method (lines 29-91) fetches entries hierarchically (project → organization → global). Add team to the hierarchy: team → project → organization → global.

When fetching entries, if the current context has a `teamId`, also fetch entries where `scope = "team"` and `scopeId = teamId`.

- [ ] **Step 2: Update knowledge base queries**

In `src/server/data-access/knowledge-base-entries.queries.ts`, add support for querying by `scope = "team"` with `scopeId = teamId`.

- [ ] **Step 3: Run typecheck**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm run typecheck`

- [ ] **Step 4: Commit**

```bash
git add src/server/services/knowledge-base.service.ts src/server/data-access/knowledge-base-entries.queries.ts
git commit -m "feat(knowledge-base): add team scope support"
```

---

## Task 28: Ensure Qdrant Client Passes `should`/`must_not` Clauses

**Files:**

- Modify: `src/server/services/rag/qdrant.service.ts`

- [ ] **Step 1: Verify `search()` and `scroll()` pass full filter**

In `src/server/services/rag/qdrant.service.ts`, the `search()` method (line 467) and `scroll()` method (line 535) pass `filter` to the Qdrant client. Verify they pass the filter object as-is (including `should` and `must_not` properties), not just `filter.must`. The current code casts `filter as Record<string, unknown>`, which should preserve all properties. Verify this is correct.

If the filter is being destructured or only `must` is extracted, update to pass the full filter object.

- [ ] **Step 2: Run typecheck**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm run typecheck`

- [ ] **Step 3: Commit (if changes needed)**

```bash
git add src/server/services/rag/qdrant.service.ts
git commit -m "fix(qdrant): ensure search/scroll pass should/must_not filter clauses"
```

---

## Task 29: Handle User Removed from Active Team

**Files:**

- Modify: `src/lib/better-auth-session.ts`

- [ ] **Step 1: Add active team validation in session resolution**

In `fetchAndBuildSession()`, after resolving `activeTeamId` and `userTeamIds`, check if the active team is still valid:

```typescript
// If user's active team is no longer in their memberships, reset to "All"
if (activeTeamId && !userTeamIds.includes(activeTeamId)) {
  // User was removed from their active team — reset to "All Teams"
  activeTeamId = null;
  // Optionally update the session record to clear activeTeamId
  try {
    await db
      .update(sessionsTable)
      .set({ activeTeamId: null })
      .where(eq(sessionsTable.id, session.session.id));
  } catch {
    // Non-critical — the null activeTeamId in the response is sufficient
  }
}
```

- [ ] **Step 2: Run typecheck**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy/apps/web && pnpm run typecheck`

- [ ] **Step 3: Commit**

```bash
git add src/lib/better-auth-session.ts
git commit -m "fix(auth): reset activeTeamId when user is removed from team"
```

---

## Task 30: Final Build Verification

- [ ] **Step 1: Run full lint, typecheck, and build**

```bash
cd /Users/nigeljanssens/Documents/projects/inovy/apps/web
pnpm lint && pnpm run typecheck && pnpm run build
```

Fix any issues found.

- [ ] **Step 2: Final commit**

```bash
git add -A
git commit -m "chore: final cleanup for team-scoped resources feature"
```
