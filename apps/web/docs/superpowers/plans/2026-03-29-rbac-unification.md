# RBAC Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a predicate-based permission engine on Better Auth's access control, replacing the scattered RBAC utilities with a unified system.

**Architecture:** A `PermissionEngine` creates composable predicates (`hasRole`, `can`, `scoped`, `any`/`all`/`not`) that check permissions via role hierarchy and Better Auth's API. `ScopeResolver`s handle DB queries for team/project membership separately. `requirePermission()` is the server-side page guard. React context + hooks provide client-side permission checks.

**Tech Stack:** Better Auth access control plugin, Drizzle ORM, React Context, Vitest

**Spec:** `docs/superpowers/specs/2026-03-29-rbac-unification-design.md`

---

## File Structure

```
src/lib/permissions/
├── types.ts               # Role, PermissionKey, PermissionSubject, PermissionContext, ROLE_HIERARCHY
├── policy-map.ts          # Static policy map from access-control.ts roles → Set<PermissionKey>
├── predicates.ts          # PermissionPredicate interface + hasRole, hasExactRole, can, scoped, all, any, not
├── engine.ts              # createPermissionEngine() factory, singleton `permissions` export
├── require-permission.ts  # requirePermission() server guard — resolves session, checks predicate, throws redirect
├── presets.ts             # Pre-defined predicates: isAdmin, isManager, canAccessTeam, canManageTeam, isSuperAdmin
├── permission-provider.tsx # PermissionProvider (client context) + usePermissionContext()
├── use-permissions.ts     # usePermissions() client hook
├── permission-gate.tsx    # <PermissionGate> declarative component
├── resolvers/
│   ├── types.ts           # ScopeResolver interface + ScopeResolverRegistry
│   ├── team-resolver.ts   # Team membership DB query
│   └── project-resolver.ts # Project → team membership DB query
└── __tests__/
    ├── policy-map.test.ts
    ├── predicates.test.ts
    ├── resolvers.test.ts
    └── engine.test.ts
```

---

### Task 1: Core Types

**Files:**

- Create: `src/lib/permissions/types.ts`

- [ ] **Step 1: Create types.ts**

```typescript
// src/lib/permissions/types.ts
import type { RoleName, Resource } from "@/lib/auth/access-control";

/**
 * Organization-scoped role. Always read from member.role (authoritative).
 * Re-exported from access-control.ts for convenience.
 */
export type Role = RoleName;

/**
 * Role hierarchy — higher number = more privilege.
 * Used by hasRole() for hierarchical "at least this role" checks.
 */
export const ROLE_HIERARCHY: Record<Role, number> = {
  superadmin: 6,
  admin: 5,
  owner: 4,
  manager: 3,
  user: 2,
  viewer: 1,
};

/**
 * Permission key in "resource:action" format.
 * e.g., "project:create", "admin:all", "team:read"
 */
export type PermissionKey = `${Resource}:${string}`;

/**
 * The subject of a permission check. Always constructed from the session's member record.
 */
export interface PermissionSubject {
  role: Role;
  userId: string;
}

/**
 * Optional context for scoped permission checks (team/project membership).
 */
export interface PermissionContext {
  organizationId?: string;
  teamId?: string;
  projectId?: string;
  [key: string]: unknown;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/permissions/types.ts
git commit -m "feat(permissions): add core types for permission engine"
```

---

### Task 2: Static Policy Map

**Files:**

- Create: `src/lib/permissions/policy-map.ts`
- Create: `src/lib/permissions/__tests__/policy-map.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/permissions/__tests__/policy-map.test.ts
import { describe, expect, it } from "vitest";
import {
  POLICY_MAP,
  roleHasPermission,
  computePermissionSet,
} from "../policy-map";
import type { Role, PermissionKey } from "../types";

describe("POLICY_MAP", () => {
  it("superadmin has all permissions from access-control.ts", () => {
    const superadminPerms = POLICY_MAP.superadmin;
    expect(superadminPerms.has("project:create")).toBe(true);
    expect(superadminPerms.has("project:read")).toBe(true);
    expect(superadminPerms.has("project:update")).toBe(true);
    expect(superadminPerms.has("project:delete")).toBe(true);
    expect(superadminPerms.has("superadmin:all")).toBe(true);
    expect(superadminPerms.has("admin:all")).toBe(true);
    expect(superadminPerms.has("team:create")).toBe(true);
    expect(superadminPerms.has("invitation:create")).toBe(true);
  });

  it("viewer has only read permissions", () => {
    const viewerPerms = POLICY_MAP.viewer;
    expect(viewerPerms.has("project:read")).toBe(true);
    expect(viewerPerms.has("project:create")).toBe(false);
    expect(viewerPerms.has("project:delete")).toBe(false);
    expect(viewerPerms.has("admin:all")).toBe(false);
    expect(viewerPerms.has("setting:read")).toBe(true);
    expect(viewerPerms.has("setting:update")).toBe(false);
  });

  it("user cannot delete projects", () => {
    expect(POLICY_MAP.user.has("project:delete")).toBe(false);
  });

  it("user can create projects", () => {
    expect(POLICY_MAP.user.has("project:create")).toBe(true);
  });

  it("manager has invitation permissions", () => {
    expect(POLICY_MAP.manager.has("invitation:create")).toBe(true);
    expect(POLICY_MAP.manager.has("invitation:cancel")).toBe(true);
  });

  it("admin has audit-log read", () => {
    expect(POLICY_MAP.admin.has("audit-log:read")).toBe(true);
  });

  it("owner maps to same permissions as admin", () => {
    const adminPerms = [...POLICY_MAP.admin].sort();
    const ownerPerms = [...POLICY_MAP.owner].sort();
    expect(ownerPerms).toEqual(adminPerms);
  });
});

describe("roleHasPermission", () => {
  it("returns true for granted permission", () => {
    expect(
      roleHasPermission("superadmin", "superadmin:all" as PermissionKey),
    ).toBe(true);
  });

  it("returns false for denied permission", () => {
    expect(roleHasPermission("viewer", "project:delete" as PermissionKey)).toBe(
      false,
    );
  });
});

describe("computePermissionSet", () => {
  it("returns a Set of permission keys for a role", () => {
    const perms = computePermissionSet("viewer");
    expect(perms).toBeInstanceOf(Set);
    expect(perms.has("project:read")).toBe(true);
    expect(perms.has("project:delete")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy && pnpm --filter web exec vitest run src/lib/permissions/__tests__/policy-map.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

```typescript
// src/lib/permissions/policy-map.ts
import { roles, type RoleName } from "@/lib/auth/access-control";
import type { PermissionKey, Role } from "./types";

/**
 * Build a static policy map from Better Auth role definitions.
 * Each role maps to a Set of "resource:action" permission keys.
 *
 * This is the sync source of truth — derived from the same ac.newRole()
 * definitions that Better Auth uses at runtime.
 */
function buildPolicyMap(roleDefs: typeof roles): Record<RoleName, Set<string>> {
  const map = {} as Record<RoleName, Set<string>>;

  for (const [roleName, roleDef] of Object.entries(roleDefs)) {
    const permSet = new Set<string>();

    // roleDef.statements is the internal structure of a Better Auth role
    // It contains { resource: actions[] } pairs
    // Access the role's permission statements
    const statements = (roleDef as Record<string, unknown>).statements as
      | Record<string, string[]>[]
      | undefined;

    if (statements) {
      for (const statement of statements) {
        for (const [resource, actions] of Object.entries(statement)) {
          for (const action of actions) {
            permSet.add(`${resource}:${action}`);
          }
        }
      }
    }

    map[roleName as RoleName] = permSet;
  }

  return map;
}

export const POLICY_MAP: Record<RoleName, Set<string>> = buildPolicyMap(roles);

/**
 * Check if a role has a specific permission in the static policy map.
 */
export function roleHasPermission(
  role: Role,
  permission: PermissionKey,
): boolean {
  return POLICY_MAP[role]?.has(permission) ?? false;
}

/**
 * Get the full permission set for a role. Used by PermissionProvider
 * to pre-compute permissions for client-side usage.
 */
export function computePermissionSet(role: Role): Set<string> {
  return new Set(POLICY_MAP[role] ?? []);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy && pnpm --filter web exec vitest run src/lib/permissions/__tests__/policy-map.test.ts`
Expected: PASS

**Note:** The `roleDef.statements` access pattern may need adjustment based on how Better Auth internally structures roles. If tests fail because the internal structure differs, inspect a role object at runtime:

```typescript
console.log(JSON.stringify(roles.superadmin, null, 2));
```

Then adjust `buildPolicyMap` to match the actual structure. The key insight: `ac.newRole({ project: ["create", "read"] })` returns an object whose internal shape we need to read. If it's not `.statements`, it might be stored directly as the input object. In that case, replace the `statements` iteration with direct iteration over the role definition's own properties.

- [ ] **Step 5: Commit**

```bash
git add src/lib/permissions/policy-map.ts src/lib/permissions/__tests__/policy-map.test.ts
git commit -m "feat(permissions): add static policy map derived from access-control.ts"
```

---

### Task 3: Scope Resolver Interface

**Files:**

- Create: `src/lib/permissions/resolvers/types.ts`

- [ ] **Step 1: Create resolver types**

```typescript
// src/lib/permissions/resolvers/types.ts
import type { PermissionSubject, PermissionContext } from "../types";

/**
 * A ScopeResolver handles the I/O (DB query) portion of scoped permission checks.
 * One resolver per scope type (e.g., "team", "project").
 *
 * Resolvers are registered in the PermissionEngine and called by scoped() predicates.
 * They ONLY answer "is this user a member of this scope?" — role logic is separate.
 */
export interface ScopeResolver {
  readonly scope: string;
  resolve(
    subject: PermissionSubject,
    context: PermissionContext,
  ): Promise<boolean>;
}

/**
 * Registry that maps scope names to their resolvers.
 */
export class ScopeResolverRegistry {
  private resolvers = new Map<string, ScopeResolver>();

  register(resolver: ScopeResolver): void {
    this.resolvers.set(resolver.scope, resolver);
  }

  get(scope: string): ScopeResolver | undefined {
    return this.resolvers.get(scope);
  }

  has(scope: string): boolean {
    return this.resolvers.has(scope);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/permissions/resolvers/types.ts
git commit -m "feat(permissions): add ScopeResolver interface and registry"
```

---

### Task 4: Predicate Builders

**Files:**

- Create: `src/lib/permissions/predicates.ts`
- Create: `src/lib/permissions/__tests__/predicates.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/lib/permissions/__tests__/predicates.test.ts
import { describe, expect, it, vi } from "vitest";
import {
  hasRole,
  hasExactRole,
  can,
  scoped,
  all,
  any,
  not,
} from "../predicates";
import type { PermissionPredicate } from "../predicates";
import type { PermissionSubject, PermissionKey } from "../types";
import { ScopeResolverRegistry } from "../resolvers/types";

const superadmin: PermissionSubject = { role: "superadmin", userId: "u1" };
const admin: PermissionSubject = { role: "admin", userId: "u2" };
const manager: PermissionSubject = { role: "manager", userId: "u3" };
const user: PermissionSubject = { role: "user", userId: "u4" };
const viewer: PermissionSubject = { role: "viewer", userId: "u5" };
const owner: PermissionSubject = { role: "owner", userId: "u6" };

describe("hasRole", () => {
  it("returns true when subject role meets minimum", () => {
    const pred = hasRole("manager");
    expect(pred.check(superadmin)).toBe(true);
    expect(pred.check(admin)).toBe(true);
    expect(pred.check(owner)).toBe(true);
    expect(pred.check(manager)).toBe(true);
  });

  it("returns false when subject role is below minimum", () => {
    const pred = hasRole("manager");
    expect(pred.check(user)).toBe(false);
    expect(pred.check(viewer)).toBe(false);
  });

  it("resolve returns same result as check (no async needed)", async () => {
    const pred = hasRole("admin");
    expect(await pred.resolve(admin)).toBe(true);
    expect(await pred.resolve(manager)).toBe(false);
  });

  it("has a descriptive label", () => {
    expect(hasRole("manager").label).toBe("hasRole(manager)");
  });
});

describe("hasExactRole", () => {
  it("returns true only for exact matches", () => {
    const pred = hasExactRole("superadmin");
    expect(pred.check(superadmin)).toBe(true);
    expect(pred.check(admin)).toBe(false);
  });

  it("supports multiple roles", () => {
    const pred = hasExactRole("admin", "owner");
    expect(pred.check(admin)).toBe(true);
    expect(pred.check(owner)).toBe(true);
    expect(pred.check(superadmin)).toBe(false);
  });
});

describe("can", () => {
  it("returns true when role has permission in policy map", () => {
    const pred = can("project:create" as PermissionKey);
    expect(pred.check(superadmin)).toBe(true);
    expect(pred.check(admin)).toBe(true);
    expect(pred.check(user)).toBe(true);
    expect(pred.check(viewer)).toBe(false);
  });

  it("returns false for ungranted permission", () => {
    const pred = can("superadmin:all" as PermissionKey);
    expect(pred.check(admin)).toBe(false);
    expect(pred.check(superadmin)).toBe(true);
  });
});

describe("scoped", () => {
  it("check() falls back to hasRole user (non-scoped approximation)", () => {
    const pred = scoped("team:read" as PermissionKey);
    // Sync check cannot resolve scope — falls back to role-only
    expect(pred.check(user)).toBe(true);
    expect(pred.check(viewer)).toBe(false);
  });

  it("resolve() calls scope resolver when registry is provided", async () => {
    const registry = new ScopeResolverRegistry();
    const mockResolver = {
      scope: "team",
      resolve: vi.fn().mockResolvedValue(true),
    };
    registry.register(mockResolver);

    const pred = scoped("team:read" as PermissionKey, registry);
    const result = await pred.resolve(user, { teamId: "t1" });
    expect(result).toBe(true);
    expect(mockResolver.resolve).toHaveBeenCalledWith(user, { teamId: "t1" });
  });

  it("resolve() returns false when no resolver found", async () => {
    const registry = new ScopeResolverRegistry();
    const pred = scoped("team:read" as PermissionKey, registry);
    const result = await pred.resolve(user, { teamId: "t1" });
    expect(result).toBe(false);
  });
});

describe("combinators", () => {
  const alwaysTrue: PermissionPredicate = {
    check: () => true,
    resolve: async () => true,
    label: "alwaysTrue",
  };
  const alwaysFalse: PermissionPredicate = {
    check: () => false,
    resolve: async () => false,
    label: "alwaysFalse",
  };

  describe("all", () => {
    it("returns true when all predicates pass", () => {
      expect(all(alwaysTrue, alwaysTrue).check(user)).toBe(true);
    });

    it("returns false when any predicate fails", () => {
      expect(all(alwaysTrue, alwaysFalse).check(user)).toBe(false);
    });

    it("short-circuits on first false", async () => {
      const spy = vi.fn().mockResolvedValue(true);
      const tracked: PermissionPredicate = {
        check: () => true,
        resolve: spy,
        label: "tracked",
      };
      await all(alwaysFalse, tracked).resolve(user);
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe("any", () => {
    it("returns true when any predicate passes", () => {
      expect(any(alwaysFalse, alwaysTrue).check(user)).toBe(true);
    });

    it("returns false when all predicates fail", () => {
      expect(any(alwaysFalse, alwaysFalse).check(user)).toBe(false);
    });

    it("short-circuits on first true", async () => {
      const spy = vi.fn().mockResolvedValue(false);
      const tracked: PermissionPredicate = {
        check: () => false,
        resolve: spy,
        label: "tracked",
      };
      await any(alwaysTrue, tracked).resolve(user);
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe("not", () => {
    it("inverts the result", () => {
      expect(not(alwaysTrue).check(user)).toBe(false);
      expect(not(alwaysFalse).check(user)).toBe(true);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy && pnpm --filter web exec vitest run src/lib/permissions/__tests__/predicates.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

```typescript
// src/lib/permissions/predicates.ts
import type {
  Role,
  PermissionKey,
  PermissionSubject,
  PermissionContext,
} from "./types";
import { ROLE_HIERARCHY } from "./types";
import { roleHasPermission } from "./policy-map";
import type { ScopeResolverRegistry } from "./resolvers/types";

/**
 * A predicate that resolves a permission decision.
 * check() is sync (role-only, static policy map). resolve() is async (may do I/O).
 */
export interface PermissionPredicate {
  check(subject: PermissionSubject, context?: PermissionContext): boolean;
  resolve(
    subject: PermissionSubject,
    context?: PermissionContext,
  ): Promise<boolean>;
  readonly label: string;
}

/**
 * Hierarchical role check. Returns true if subject's role >= minimumRole.
 * hasRole("manager") returns true for manager, owner, admin, superadmin.
 */
export function hasRole(minimumRole: Role): PermissionPredicate {
  return {
    check(subject) {
      return (
        (ROLE_HIERARCHY[subject.role] ?? 0) >=
        (ROLE_HIERARCHY[minimumRole] ?? 0)
      );
    },
    async resolve(subject) {
      return this.check(subject);
    },
    label: `hasRole(${minimumRole})`,
  };
}

/**
 * Exact role match. Returns true only if subject.role is one of the listed roles.
 */
export function hasExactRole(...roles: Role[]): PermissionPredicate {
  const roleSet = new Set(roles);
  return {
    check(subject) {
      return roleSet.has(subject.role);
    },
    async resolve(subject) {
      return this.check(subject);
    },
    label: `hasExactRole(${roles.join(",")})`,
  };
}

/**
 * Better Auth resource:action permission check.
 * check() uses the static policy map (sync). resolve() also uses the static map.
 */
export function can(permission: PermissionKey): PermissionPredicate {
  return {
    check(subject) {
      return roleHasPermission(subject.role, permission);
    },
    async resolve(subject) {
      return roleHasPermission(subject.role, permission);
    },
    label: `can(${permission})`,
  };
}

/**
 * Scoped permission check — resolve() triggers a registered ScopeResolver.
 * check() falls back to a role-only approximation (hasRole("user")).
 */
export function scoped(
  permission: PermissionKey,
  registry?: ScopeResolverRegistry,
): PermissionPredicate {
  // Extract scope from permission key (e.g., "team:read" → "team")
  const scope = permission.split(":")[0];

  return {
    check(subject) {
      // Sync fallback: approximate by checking if user has at least "user" role
      return (ROLE_HIERARCHY[subject.role] ?? 0) >= ROLE_HIERARCHY.user;
    },
    async resolve(subject, context) {
      if (!registry) return false;
      const resolver = registry.get(scope);
      if (!resolver) return false;
      return resolver.resolve(subject, context ?? {});
    },
    label: `scoped(${permission})`,
  };
}

/**
 * All predicates must pass. Short-circuits on first false.
 */
export function all(...predicates: PermissionPredicate[]): PermissionPredicate {
  return {
    check(subject, context) {
      return predicates.every((p) => p.check(subject, context));
    },
    async resolve(subject, context) {
      for (const p of predicates) {
        if (!(await p.resolve(subject, context))) return false;
      }
      return true;
    },
    label: `all(${predicates.map((p) => p.label).join(",")})`,
  };
}

/**
 * At least one predicate must pass. Short-circuits on first true.
 */
export function any(...predicates: PermissionPredicate[]): PermissionPredicate {
  return {
    check(subject, context) {
      return predicates.some((p) => p.check(subject, context));
    },
    async resolve(subject, context) {
      for (const p of predicates) {
        if (await p.resolve(subject, context)) return true;
      }
      return false;
    },
    label: `any(${predicates.map((p) => p.label).join(",")})`,
  };
}

/**
 * Inverts a predicate.
 */
export function not(predicate: PermissionPredicate): PermissionPredicate {
  return {
    check(subject, context) {
      return !predicate.check(subject, context);
    },
    async resolve(subject, context) {
      return !(await predicate.resolve(subject, context));
    },
    label: `not(${predicate.label})`,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy && pnpm --filter web exec vitest run src/lib/permissions/__tests__/predicates.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/permissions/predicates.ts src/lib/permissions/__tests__/predicates.test.ts
git commit -m "feat(permissions): add predicate builders with combinators"
```

---

### Task 5: Scope Resolvers (Team + Project)

**Files:**

- Create: `src/lib/permissions/resolvers/team-resolver.ts`
- Create: `src/lib/permissions/resolvers/project-resolver.ts`
- Create: `src/lib/permissions/__tests__/resolvers.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/lib/permissions/__tests__/resolvers.test.ts
import { describe, expect, it, vi } from "vitest";
import type { PermissionSubject, PermissionContext } from "../types";

// Mock the DB module before importing resolvers
vi.mock("@/server/db", () => ({
  db: {
    select: vi.fn(),
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col, val) => ({ col, val, op: "eq" })),
  and: vi.fn((...args: unknown[]) => ({ args, op: "and" })),
}));

vi.mock("@/server/db/schema/auth", () => ({
  teamMembers: {
    userId: "teamMembers.userId",
    teamId: "teamMembers.teamId",
  },
}));

vi.mock("@/server/db/schema/projects", () => ({
  projects: {
    id: "projects.id",
    teamId: "projects.teamId",
  },
}));

import { teamScopeResolver } from "../resolvers/team-resolver";
import { projectScopeResolver } from "../resolvers/project-resolver";
import { db } from "@/server/db";

const subject: PermissionSubject = { role: "user", userId: "u1" };

describe("teamScopeResolver", () => {
  it("has scope 'team'", () => {
    expect(teamScopeResolver.scope).toBe("team");
  });

  it("returns false when no teamId in context", async () => {
    const result = await teamScopeResolver.resolve(subject, {});
    expect(result).toBe(false);
  });

  it("returns true when user is a team member", async () => {
    const mockFrom = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([{ teamId: "t1" }]),
      }),
    });
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const result = await teamScopeResolver.resolve(subject, { teamId: "t1" });
    expect(result).toBe(true);
  });

  it("returns false when user is not a team member", async () => {
    const mockFrom = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([]),
      }),
    });
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const result = await teamScopeResolver.resolve(subject, { teamId: "t1" });
    expect(result).toBe(false);
  });
});

describe("projectScopeResolver", () => {
  it("has scope 'project'", () => {
    expect(projectScopeResolver.scope).toBe("project");
  });

  it("returns false when no projectId in context", async () => {
    const result = await projectScopeResolver.resolve(subject, {});
    expect(result).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy && pnpm --filter web exec vitest run src/lib/permissions/__tests__/resolvers.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write team-resolver.ts**

```typescript
// src/lib/permissions/resolvers/team-resolver.ts
import { db } from "@/server/db";
import { teamMembers } from "@/server/db/schema/auth";
import { and, eq } from "drizzle-orm";
import type { ScopeResolver } from "./types";

/**
 * Resolves team membership by querying the teamMembers table.
 * Returns true if the user is a member of the specified team.
 */
export const teamScopeResolver: ScopeResolver = {
  scope: "team",
  async resolve(subject, context) {
    if (!context.teamId) return false;

    const rows = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.userId, subject.userId),
          eq(teamMembers.teamId, context.teamId as string),
        ),
      )
      .limit(1);

    return rows.length > 0;
  },
};
```

- [ ] **Step 4: Write project-resolver.ts**

```typescript
// src/lib/permissions/resolvers/project-resolver.ts
import { db } from "@/server/db";
import { teamMembers } from "@/server/db/schema/auth";
import { projects } from "@/server/db/schema/projects";
import { and, eq } from "drizzle-orm";
import type { ScopeResolver } from "./types";

/**
 * Resolves project access by checking if the user is a member of the project's team.
 * Performs two queries: fetch the project's teamId, then check team membership.
 */
export const projectScopeResolver: ScopeResolver = {
  scope: "project",
  async resolve(subject, context) {
    if (!context.projectId) return false;

    // Get the project's team
    const [project] = await db
      .select({ teamId: projects.teamId })
      .from(projects)
      .where(eq(projects.id, context.projectId as string))
      .limit(1);

    if (!project?.teamId) return false;

    // Check team membership
    const rows = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.userId, subject.userId),
          eq(teamMembers.teamId, project.teamId),
        ),
      )
      .limit(1);

    return rows.length > 0;
  },
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy && pnpm --filter web exec vitest run src/lib/permissions/__tests__/resolvers.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/permissions/resolvers/team-resolver.ts src/lib/permissions/resolvers/project-resolver.ts src/lib/permissions/__tests__/resolvers.test.ts
git commit -m "feat(permissions): add team and project scope resolvers"
```

---

### Task 6: Permission Engine + Presets

**Files:**

- Create: `src/lib/permissions/engine.ts`
- Create: `src/lib/permissions/presets.ts`
- Create: `src/lib/permissions/__tests__/engine.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/permissions/__tests__/engine.test.ts
import { describe, expect, it } from "vitest";
import { permissions } from "../engine";
import type { PermissionSubject, PermissionKey } from "../types";
import {
  isAdmin,
  isManager,
  isSuperAdmin,
  canAccessTeam,
  canManageTeam,
} from "../presets";

const superadmin: PermissionSubject = { role: "superadmin", userId: "u1" };
const admin: PermissionSubject = { role: "admin", userId: "u2" };
const manager: PermissionSubject = { role: "manager", userId: "u3" };
const user: PermissionSubject = { role: "user", userId: "u4" };
const viewer: PermissionSubject = { role: "viewer", userId: "u5" };

describe("permissions engine", () => {
  it("exposes hasRole", () => {
    const pred = permissions.hasRole("admin");
    expect(pred.check(superadmin)).toBe(true);
    expect(pred.check(user)).toBe(false);
  });

  it("exposes can", () => {
    const pred = permissions.can("project:create" as PermissionKey);
    expect(pred.check(user)).toBe(true);
    expect(pred.check(viewer)).toBe(false);
  });

  it("exposes combinators", () => {
    const pred = permissions.any(
      permissions.hasRole("admin"),
      permissions.hasExactRole("viewer"),
    );
    expect(pred.check(admin)).toBe(true);
    expect(pred.check(viewer)).toBe(true);
    expect(pred.check(user)).toBe(false);
  });
});

describe("presets", () => {
  it("isAdmin matches admin+ roles", () => {
    expect(isAdmin.check(superadmin)).toBe(true);
    expect(isAdmin.check(admin)).toBe(true);
    expect(isAdmin.check(manager)).toBe(false);
  });

  it("isManager matches manager+ roles", () => {
    expect(isManager.check(manager)).toBe(true);
    expect(isManager.check(user)).toBe(false);
  });

  it("isSuperAdmin only matches superadmin", () => {
    expect(isSuperAdmin.check(superadmin)).toBe(true);
    expect(isSuperAdmin.check(admin)).toBe(false);
  });

  it("canAccessTeam sync check passes for admin (bypass)", () => {
    expect(canAccessTeam.check(admin)).toBe(true);
  });

  it("canManageTeam sync check passes for admin (bypass)", () => {
    expect(canManageTeam.check(admin)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy && pnpm --filter web exec vitest run src/lib/permissions/__tests__/engine.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write engine.ts**

```typescript
// src/lib/permissions/engine.ts
import {
  hasRole,
  hasExactRole,
  can,
  scoped,
  all,
  any,
  not,
  type PermissionPredicate,
} from "./predicates";
import type { Role, PermissionKey } from "./types";
import { ScopeResolverRegistry, type ScopeResolver } from "./resolvers/types";
import { teamScopeResolver } from "./resolvers/team-resolver";
import { projectScopeResolver } from "./resolvers/project-resolver";

export interface PermissionEngine {
  hasRole(minimumRole: Role): PermissionPredicate;
  hasExactRole(...roles: Role[]): PermissionPredicate;
  can(permission: PermissionKey): PermissionPredicate;
  scoped(permission: PermissionKey): PermissionPredicate;
  all(...predicates: PermissionPredicate[]): PermissionPredicate;
  any(...predicates: PermissionPredicate[]): PermissionPredicate;
  not(predicate: PermissionPredicate): PermissionPredicate;
}

interface PermissionEngineConfig {
  resolvers?: ScopeResolver[];
}

export function createPermissionEngine(
  config?: PermissionEngineConfig,
): PermissionEngine {
  const registry = new ScopeResolverRegistry();
  if (config?.resolvers) {
    for (const resolver of config.resolvers) {
      registry.register(resolver);
    }
  }

  return {
    hasRole: (minimumRole) => hasRole(minimumRole),
    hasExactRole: (...roles) => hasExactRole(...roles),
    can: (permission) => can(permission),
    scoped: (permission) => scoped(permission, registry),
    all: (...predicates) => all(...predicates),
    any: (...predicates) => any(...predicates),
    not: (predicate) => not(predicate),
  };
}

/**
 * Singleton permission engine with team and project scope resolvers registered.
 * Import this everywhere: `import { permissions } from "@/lib/permissions/engine"`
 */
export const permissions = createPermissionEngine({
  resolvers: [teamScopeResolver, projectScopeResolver],
});
```

- [ ] **Step 4: Write presets.ts**

```typescript
// src/lib/permissions/presets.ts
import { permissions } from "./engine";

/** Admin access — superadmin, admin, or owner */
export const isAdmin = permissions.hasRole("admin");

/** Manager+ access — manager, owner, admin, superadmin */
export const isManager = permissions.hasRole("manager");

/** Superadmin only */
export const isSuperAdmin = permissions.hasExactRole("superadmin");

/** Team access: admin bypass OR confirmed team membership */
export const canAccessTeam = permissions.any(
  permissions.hasRole("admin"),
  permissions.scoped("team:read"),
);

/** Team management: admin bypass OR (manager role + team membership) */
export const canManageTeam = permissions.any(
  permissions.hasRole("admin"),
  permissions.all(
    permissions.hasRole("manager"),
    permissions.scoped("team:read"),
  ),
);

/** Project access: admin bypass OR project team membership */
export const canAccessProject = permissions.any(
  permissions.hasRole("admin"),
  permissions.scoped("project:read"),
);

/** Can use chat */
export const canAccessChat = permissions.hasRole("user");
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy && pnpm --filter web exec vitest run src/lib/permissions/__tests__/engine.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/permissions/engine.ts src/lib/permissions/presets.ts src/lib/permissions/__tests__/engine.test.ts
git commit -m "feat(permissions): add permission engine factory and preset predicates"
```

---

### Task 7: Server-Side Guard (requirePermission)

**Files:**

- Create: `src/lib/permissions/require-permission.ts`

- [ ] **Step 1: Write the implementation**

```typescript
// src/lib/permissions/require-permission.ts
import { redirect } from "next/navigation";
import { getBetterAuthSession } from "@/lib/better-auth-session";
import type {
  BetterAuthMember,
  BetterAuthSessionData,
} from "@/lib/better-auth-session";
import type { BetterAuthUser } from "@/lib/auth";
import type { PermissionPredicate } from "./predicates";
import type { Role, PermissionSubject, PermissionContext } from "./types";

/**
 * The full session data returned by requirePermission.
 * Provides everything pages need for both authorization and data fetching,
 * so they don't need to call getBetterAuthSession() separately.
 */
export interface GuardedSession {
  subject: PermissionSubject;
  user: BetterAuthUser;
  member: BetterAuthMember;
  organizationId: string;
  userTeamIds: string[];
}

/**
 * Server-side page guard. Resolves the auth session, checks the predicate,
 * and throws redirect on failure.
 *
 * Usage:
 *   const { user, organizationId } = await requirePermission(permissions.can("admin:all"));
 *   const { user } = await requirePermission(canAccessTeam, { teamId });
 */
export async function requirePermission(
  predicate: PermissionPredicate,
  context?: PermissionContext,
): Promise<GuardedSession> {
  const sessionResult = await getBetterAuthSession();

  if (sessionResult.isErr() || !sessionResult.value.isAuthenticated) {
    redirect("/sign-in");
  }

  const { user, member, organization, userTeamIds } = sessionResult.value;

  if (!member || !organization) {
    redirect("/sign-in");
  }

  const subject: PermissionSubject = {
    role: member.role as Role,
    userId: user.id,
  };

  const allowed = await predicate.resolve(subject, {
    organizationId: organization.id,
    ...context,
  });

  if (!allowed) {
    redirect("/");
  }

  return {
    subject,
    user,
    member,
    organizationId: organization.id,
    userTeamIds,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/permissions/require-permission.ts
git commit -m "feat(permissions): add requirePermission server-side guard"
```

---

### Task 8: React Integration

**Files:**

- Create: `src/lib/permissions/permission-provider.tsx`
- Create: `src/lib/permissions/use-permissions.ts`
- Create: `src/lib/permissions/permission-gate.tsx`

- [ ] **Step 1: Create permission-provider.tsx**

```typescript
// src/lib/permissions/permission-provider.tsx
"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Role } from "./types";

interface PermissionContextValue {
  role: Role;
  permissions: Set<string>;
}

const PermissionCtx = createContext<PermissionContextValue | null>(null);

export function PermissionProvider({
  role,
  permissionKeys,
  children,
}: {
  role: Role;
  permissionKeys: string[];
  children: ReactNode;
}) {
  // Reconstruct Set on client from serializable array
  const value: PermissionContextValue = {
    role,
    permissions: new Set(permissionKeys),
  };

  return (
    <PermissionCtx.Provider value={value}>{children}</PermissionCtx.Provider>
  );
}

export function usePermissionContext(): PermissionContextValue {
  const ctx = useContext(PermissionCtx);
  if (!ctx) {
    throw new Error(
      "usePermissionContext must be used within a PermissionProvider",
    );
  }
  return ctx;
}
```

**Note:** `Set` is not serializable across the server/client boundary. The provider accepts `permissionKeys: string[]` (serializable) and reconstructs the `Set` on the client.

- [ ] **Step 2: Create use-permissions.ts**

```typescript
// src/lib/permissions/use-permissions.ts
"use client";

import { usePermissionContext } from "./permission-provider";
import type { PermissionKey, Role } from "./types";
import { ROLE_HIERARCHY } from "./types";

/**
 * Client-side hook for permission checks.
 * Reads from the pre-computed permission context set by the server layout.
 *
 * Usage:
 *   const { can, hasRole } = usePermissions();
 *   {can("project:delete") && <DeleteButton />}
 *   {hasRole("admin") && <AdminPanel />}
 */
export function usePermissions() {
  const { role, permissions } = usePermissionContext();

  return {
    role,
    can: (permission: PermissionKey): boolean => permissions.has(permission),
    hasRole: (minimum: Role): boolean =>
      (ROLE_HIERARCHY[role] ?? 0) >= (ROLE_HIERARCHY[minimum] ?? 0),
    permissions,
  };
}
```

- [ ] **Step 3: Create permission-gate.tsx**

```typescript
// src/lib/permissions/permission-gate.tsx
"use client";

import type { ReactNode } from "react";
import { usePermissions } from "./use-permissions";
import type { PermissionKey, Role } from "./types";

/**
 * Declarative permission gate for conditional rendering.
 *
 * Usage:
 *   <PermissionGate permission="project:delete">
 *     <DeleteButton />
 *   </PermissionGate>
 *
 *   <PermissionGate minimumRole="admin" fallback={<ViewOnlyBadge />}>
 *     <EditButton />
 *   </PermissionGate>
 */
export function PermissionGate({
  permission,
  minimumRole,
  fallback = null,
  children,
}: {
  permission?: PermissionKey;
  minimumRole?: Role;
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const { can, hasRole } = usePermissions();

  const allowed = permission
    ? can(permission)
    : minimumRole
      ? hasRole(minimumRole)
      : false;

  return allowed ? <>{children}</> : <>{fallback}</>;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/permissions/permission-provider.tsx src/lib/permissions/use-permissions.ts src/lib/permissions/permission-gate.tsx
git commit -m "feat(permissions): add React permission provider, hook, and gate component"
```

---

### Task 9: Wire PermissionProvider into Main Layout

**Files:**

- Modify: `src/app/(main)/layout.tsx`

- [ ] **Step 1: Read the current layout**

Read: `src/app/(main)/layout.tsx`

Understand the current structure before modifying.

- [ ] **Step 2: Add PermissionProvider to the layout**

The layout needs to:

1. Resolve the auth session
2. Compute the permission set for the member's role
3. Wrap children with `PermissionProvider`, passing the serializable permission keys array

Add the imports and provider wrapping. The exact edit depends on the current layout structure, but the pattern is:

```typescript
import { getBetterAuthSession } from "@/lib/better-auth-session";
import { PermissionProvider } from "@/lib/permissions/permission-provider";
import { computePermissionSet } from "@/lib/permissions/policy-map";
import type { Role } from "@/lib/permissions/types";
```

Inside the layout component, wrap the existing children:

```typescript
const sessionResult = await getBetterAuthSession();
let role: Role = "viewer";
let permissionKeys: string[] = [];

if (sessionResult.isOk() && sessionResult.value.member) {
  role = sessionResult.value.member.role as Role;
  permissionKeys = [...computePermissionSet(role)];
}

// Wrap existing content with PermissionProvider
<PermissionProvider role={role} permissionKeys={permissionKeys}>
  {/* existing layout content */}
</PermissionProvider>
```

**Important:** Do not break the existing layout structure. The `PermissionProvider` wraps the children, the existing `SessionTimeoutProvider` and `PageLayout` remain unchanged.

- [ ] **Step 3: Verify the app still renders**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy && pnpm --filter web build`
Expected: Build succeeds without errors

- [ ] **Step 4: Commit**

```bash
git add src/app/\(main\)/layout.tsx
git commit -m "feat(permissions): wire PermissionProvider into main layout"
```

---

### Task 10: Run Full Test Suite + Type Check

- [ ] **Step 1: Run all permission tests**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy && pnpm --filter web exec vitest run src/lib/permissions/`
Expected: All tests PASS

- [ ] **Step 2: Run type checker**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy && pnpm --filter web exec tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Run linter**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy && pnpm --filter web exec eslint src/lib/permissions/`
Expected: No lint errors

- [ ] **Step 4: Fix any issues found and commit**

```bash
git add -A
git commit -m "fix(permissions): address test/type/lint issues"
```

---

## What's Next

This plan covers **Phase 1 — Foundation** only. The permission engine is built and wired in but nothing uses it yet (existing code still works via old utilities). Subsequent plans cover:

- **Phase 2**: Migrate 93 server actions from `policyToPermissions()` to direct `permissions.can()` predicates
- **Phase 3**: Replace all page guards with `requirePermission()` + presets, add guards to unguarded pages
- **Phase 4**: Replace component role string comparisons with `usePermissions()` / `<PermissionGate>`
- **Phase 5**: Delete `rbac.ts`, `permission-helpers.ts`, remove `user.role` reads
