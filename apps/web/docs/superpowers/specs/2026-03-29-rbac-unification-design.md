# RBAC Unification: Permission Engine on Better Auth

**Issue**: #655
**Date**: 2026-03-29
**Status**: Draft

## Goal

Replace the three overlapping authorization mechanisms (Better Auth `checkPermission()`, manual `rbac.ts` utilities, raw string comparisons) with a single predicate-based permission engine built on Better Auth's access control plugin. Every page must be guarded. `member.role` is the single source of truth.

## Current State

### What exists

- **`access-control.ts`**: Defines 16 resources, 5 role configs (superAdmin, admin, manager, user, viewer), and a `roles` export mapping role names to configs. Owner maps to admin. Already exports `Resource`, `Action<T>`, `RoleName` types.
- **`permissions-server.ts`**: `checkPermission()` calls `auth.api.hasPermission()`. Used in 29 page guards and server action middleware.
- **`permissions-client.ts`**: `checkPermissionClient()` and `checkRolePermission()` for client-side checks.
- **`permissions.ts`**: `Permissions` object with presets like `Permissions.project.create`. Used in 93+ server action metadata via `policyToPermissions()`.
- **`rbac.ts`**: Manual utilities — `isOrganizationAdmin()`, `isTeamManager()`, `canAccessTeam()`, `isProjectManager()`, `isSuperAdmin()`, `canAccessOrganizationChat()`. Check both `user.role` and `member.role`. Some embed DB queries.
- **`team-isolation.ts`**: `assertTeamAccess()`, `buildTeamFilter()` — data scoping, stays unchanged.
- **`organization-isolation.ts`**: `assertOrganizationAccess()`, `filterByOrganization()` — data scoping, stays unchanged.
- **Raw string comparisons**: 7+ locations with `member.role !== "superadmin"`, `includes("admin")`, etc.

### What's wrong

1. `member.role` is authoritative but `isOrganizationAdmin()` also checks `user.role`
2. `canAccessTeam()` mixes permission logic with DB queries — silent denial on query failure
3. Same question answered 3 different ways depending on the caller
4. Many pages lack role guards entirely
5. Adding a new permission requires touching multiple systems

## Design

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Callers                                │
│  Pages  │  Server Actions  │  Components  │  API Routes  │
└────┬────┴────────┬─────────┴──────┬───────┴──────┬───────┘
     │             │                │              │
     ▼             ▼                ▼              ▼
┌─────────────────────────────────────────────────────────┐
│              Permission Engine (new)                      │
│                                                          │
│  requirePermission()  │  usePermissions()  │  <Gate>     │
│                                                          │
│  Predicates: can() │ hasRole() │ scoped() │ any/all/not  │
└────────────┬────────────────────────┬────────────────────┘
             │                        │
             ▼                        ▼
┌────────────────────────┐  ┌──────────────────────────────┐
│  Better Auth            │  │  Scope Resolvers              │
│  auth.api.hasPermission │  │  team membership (DB query)   │
│  (canonical async)      │  │  project membership (DB query)│
└────────────────────────┘  └──────────────────────────────┘

Unchanged: assertOrganizationAccess, assertTeamAccess, buildTeamFilter (data scoping)
```

### File Structure

```
src/lib/permissions/
├── engine.ts              # PermissionEngine factory + createPermissionEngine()
├── predicates.ts          # PermissionPredicate interface + hasRole, can, scoped, combinators
├── types.ts               # PermissionKey, PermissionContext, PermissionSubject
├── policy-map.ts          # Static policy map derived from access-control.ts roles
├── require-permission.ts  # Server-side guard (throws redirect)
├── permission-provider.tsx # React context provider (server component)
├── use-permissions.ts     # Client hook
├── permission-gate.tsx    # <PermissionGate> component
├── resolvers/
│   ├── types.ts           # ScopeResolver interface
│   ├── team-resolver.ts   # Team membership DB query
│   └── project-resolver.ts # Project team membership DB query
└── presets.ts             # Pre-defined predicates (canManageTeam, canAccessTeam, etc.)
```

### Core Types

Built on top of existing exports from `access-control.ts`:

```typescript
// types.ts
import type { RoleName, Resource } from "@/lib/auth/access-control";

// Re-export for convenience
export type Role = RoleName; // "superadmin" | "owner" | "admin" | "manager" | "user" | "viewer"

// Role hierarchy — used by hasRole() for hierarchical checks
export const ROLE_HIERARCHY: Record<Role, number> = {
  superadmin: 6,
  admin: 5,
  owner: 4,
  manager: 3,
  user: 2,
  viewer: 1,
};

// Flatten all resource:action pairs from the statement
// e.g., "project:create" | "project:read" | "recording:delete" | "admin:all" | ...
export type PermissionKey = `${Resource}:${string}`;

export interface PermissionSubject {
  role: Role;
  userId: string;
}

export interface PermissionContext {
  organizationId?: string;
  teamId?: string;
  projectId?: string;
  [key: string]: unknown;
}
```

### PermissionPredicate Interface

Every permission check is a predicate with dual execution modes:

```typescript
// predicates.ts
export interface PermissionPredicate {
  /** Sync check — uses only role + static policy map. No I/O. */
  check(subject: PermissionSubject, context?: PermissionContext): boolean;

  /** Async check — may call Better Auth API or scope resolvers (DB). Canonical. */
  resolve(
    subject: PermissionSubject,
    context?: PermissionContext,
  ): Promise<boolean>;

  /** Human-readable label for debugging/audit logging */
  readonly label: string;
}
```

### Predicate Builders

```typescript
// predicates.ts

/**
 * Hierarchical role check. hasRole("manager") returns true for manager, owner, admin, superadmin.
 * Pure sync — no I/O.
 */
export function hasRole(minimumRole: Role): PermissionPredicate;

/**
 * Exact role match. hasExactRole("superadmin") returns true only for superadmin.
 * Pure sync — no I/O.
 */
export function hasExactRole(...roles: Role[]): PermissionPredicate;

/**
 * Better Auth resource:action check.
 * check() resolves against the static policy map (sync).
 * resolve() calls auth.api.hasPermission() (async, canonical).
 */
export function can(permission: PermissionKey): PermissionPredicate;

/**
 * Scoped permission check — resolve() triggers a registered ScopeResolver.
 * check() falls back to role-only approximation (hasRole("user")).
 * Used for team/project membership checks.
 */
export function scoped(permission: PermissionKey): PermissionPredicate;

// Combinators — short-circuit evaluation
export function all(...predicates: PermissionPredicate[]): PermissionPredicate;
export function any(...predicates: PermissionPredicate[]): PermissionPredicate;
export function not(predicate: PermissionPredicate): PermissionPredicate;
```

### Static Policy Map

Derived at module load time from the `roles` export in `access-control.ts`. Maps each `RoleName` to a `Set<PermissionKey>`:

```typescript
// policy-map.ts
import { roles, type RoleName, type Resource } from "@/lib/auth/access-control";

// Build once at import time
// Result: { superadmin: Set(["project:create", "project:read", ...]), admin: Set([...]), ... }
export const POLICY_MAP: Record<RoleName, Set<string>> = buildPolicyMap(roles);

export function roleHasPermission(
  role: RoleName,
  permission: PermissionKey,
): boolean {
  return POLICY_MAP[role]?.has(permission) ?? false;
}
```

This enables `can("project:create").check()` to resolve synchronously without an API call. The async `can("project:create").resolve()` still calls `auth.api.hasPermission()` as the canonical source.

### Scope Resolvers

Separate DB queries from permission logic. Registered at engine creation:

```typescript
// resolvers/types.ts
export interface ScopeResolver {
  readonly scope: string; // "team" | "project"
  resolve(
    subject: PermissionSubject,
    context: PermissionContext,
  ): Promise<boolean>;
}

// resolvers/team-resolver.ts
export const teamScopeResolver: ScopeResolver = {
  scope: "team",
  async resolve(subject, context) {
    if (!context.teamId) return false;
    const membership = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.userId, subject.userId),
        eq(teamMembers.teamId, context.teamId),
      ),
    });
    return !!membership;
  },
};

// resolvers/project-resolver.ts
export const projectScopeResolver: ScopeResolver = {
  scope: "project",
  async resolve(subject, context) {
    if (!context.projectId) return false;
    // Check if user's teams include the project's team
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, context.projectId),
      columns: { teamId: true },
    });
    if (!project?.teamId) return false;
    const membership = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.userId, subject.userId),
        eq(teamMembers.teamId, project.teamId),
      ),
    });
    return !!membership;
  },
};
```

### Permission Engine

Factory that creates the engine with scope resolvers registered:

```typescript
// engine.ts
import { teamScopeResolver } from "./resolvers/team-resolver";
import { projectScopeResolver } from "./resolvers/project-resolver";

export const permissions = createPermissionEngine({
  resolvers: [teamScopeResolver, projectScopeResolver],
});

// permissions.hasRole("admin")
// permissions.can("project:create")
// permissions.scoped("team:read")
// permissions.any(permissions.hasRole("admin"), permissions.scoped("team:read"))
```

### Server-Side Guard

```typescript
// require-permission.ts
import { redirect } from "next/navigation";
import { getBetterAuthSession } from "@/lib/better-auth-session";

/** The full session data returned by requirePermission — enough for both auth and data fetching */
interface GuardedSession {
  subject: PermissionSubject;
  user: BetterAuthUser;
  member: BetterAuthMember;
  organization: { id: string };
  userTeamIds: string[];
}

/**
 * Server-side guard. Resolves auth session, checks predicate, throws redirect on failure.
 * Returns the full session so pages don't need to double-fetch.
 */
export async function requirePermission(
  predicate: PermissionPredicate,
  context?: PermissionContext,
): Promise<GuardedSession> {
  const sessionResult = await getBetterAuthSession();
  if (sessionResult.isErr() || !sessionResult.value.member) {
    redirect("/sign-in");
  }

  const { user, member, organization, userTeamIds } = sessionResult.value;
  const subject: PermissionSubject = {
    role: member.role as Role,
    userId: user.id,
  };

  const allowed = await predicate.resolve(subject, context);
  if (!allowed) {
    redirect("/");
  }

  return {
    subject,
    user,
    member,
    organization: { id: organization.id },
    userTeamIds,
  };
}
```

Note: `requirePermission` resolves the session internally and returns the full session. Callers don't pass `subject` — the guard does it all. Pages use the returned session for data fetching, avoiding a double session fetch.

### React Integration

**Server-side provider** — computes permission set once per request:

```typescript
// permission-provider.tsx
"use client";
import { createContext, useContext } from "react";

interface PermissionContextValue {
  role: Role;
  permissions: Set<string>;
}

const PermissionCtx = createContext<PermissionContextValue | null>(null);

export function PermissionProvider({
  value,
  children,
}: {
  value: PermissionContextValue;
  children: React.ReactNode;
}) {
  return <PermissionCtx.Provider value={value}>{children}</PermissionCtx.Provider>;
}

export function usePermissionContext() {
  const ctx = useContext(PermissionCtx);
  if (!ctx) throw new Error("usePermissionContext must be used within PermissionProvider");
  return ctx;
}
```

**Client hook:**

```typescript
// use-permissions.ts
"use client";
export function usePermissions() {
  const { role, permissions } = usePermissionContext();

  return {
    role,
    can: (permission: PermissionKey) => permissions.has(permission),
    hasRole: (minimum: Role) => ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minimum],
    permissions,
  };
}
```

**Gate component:**

```typescript
// permission-gate.tsx
"use client";
export function PermissionGate({
  permission,
  minimumRole,
  fallback = null,
  children,
}: {
  permission?: PermissionKey;
  minimumRole?: Role;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { can, hasRole } = usePermissions();
  const allowed = permission
    ? can(permission)
    : minimumRole
      ? hasRole(minimumRole)
      : false;
  return allowed ? children : fallback;
}
```

### Pre-defined Predicates

Common patterns defined once, reused everywhere:

```typescript
// presets.ts
import { permissions } from "./engine";

// Admin access (superadmin, admin, owner)
export const isAdmin = permissions.hasRole("admin");

// Manager+ access
export const isManager = permissions.hasRole("manager");

// Team access: admin bypass OR team membership
export const canAccessTeam = permissions.any(
  permissions.hasRole("admin"),
  permissions.scoped("team:read"),
);

// Team management: admin bypass OR team membership + manager role
export const canManageTeam = permissions.any(
  permissions.hasRole("admin"),
  permissions.all(
    permissions.hasRole("manager"),
    permissions.scoped("team:read"),
  ),
);

// Superadmin only
export const isSuperAdmin = permissions.hasExactRole("superadmin");
```

### Page Guard Usage

**Before:**

```typescript
// Inconsistent — uses manual utilities
const authResult = await getBetterAuthSession();
if (authResult.isErr()) redirect("/sign-in");
const { user, member } = authResult.value;
const isAdmin = isOrganizationAdmin(user, member);
if (!isAdmin) redirect("/");
```

**After:**

```typescript
// One-liner guard, returns session for data fetching
const { user, organization, userTeamIds } = await requirePermission(
  permissions.can("admin:all"),
);
```

**Team-scoped page:**

```typescript
const { user, organization } = await requirePermission(canAccessTeam, {
  teamId,
});
```

**Client component:**

```typescript
const { can, hasRole } = usePermissions();
{can("project:delete") && <DeleteButton />}
{hasRole("admin") && <AdminPanel />}
```

### Layout-Level Provider

The `PermissionProvider` is added to the `(main)` layout so all authenticated pages have access:

```typescript
// app/(main)/layout.tsx
import { PermissionProvider } from "@/lib/permissions/permission-provider";
import { computePermissionSet } from "@/lib/permissions/policy-map";

export default async function MainLayout({ children }) {
  const session = await getBetterAuthSession();
  if (session.isErr()) redirect("/sign-in");

  const { member } = session.value;
  const permissionSet = computePermissionSet(member.role as Role);

  return (
    <PermissionProvider value={{ role: member.role as Role, permissions: permissionSet }}>
      {children}
    </PermissionProvider>
  );
}
```

## Migration Plan

### Phase 1 — Foundation

Build the permission engine, static policy map, scope resolvers, React integration. Keep old `rbac.ts` functions working — don't break anything.

### Phase 2 — Server Actions (93 files)

These already use Better Auth via `policyToPermissions()` in action metadata. Migrate to direct `permissions.can()` predicates. Mostly mechanical, low risk.

### Phase 3 — Page Guards (all pages)

Replace `isOrganizationAdmin()`, `canAccessTeam()`, `isTeamManager()` with `requirePermission()` + composed predicates. Add guards to all currently unguarded pages.

### Phase 4 — Components (7+ files)

Replace raw string comparisons with `usePermissions()` hook or `<PermissionGate>` component. Add `PermissionProvider` to main layout.

### Phase 5 — Cleanup

Delete `rbac.ts` utility functions. Remove `policyToPermissions()` helper. Remove all `user.role` reads from permission checks. `user.role` column can be deprecated later.

## Testing Strategy

### Boundary tests to write

- **Static policy map correctness**: Every role × resource:action pair matches the `ac.newRole()` definitions
- **Role hierarchy**: `hasRole("manager").check({ role: "admin" })` returns true
- **Combinator short-circuiting**: `any(hasRole("admin"), scoped("team:read"))` skips DB query for admins
- **Scope resolvers**: Team/project membership returns correct results with in-memory test data
- **`requirePermission`**: Redirects unauthenticated users, denies unauthorized, passes authorized

### What gets deleted

- Tests mocking `isOrganizationAdmin`, `isTeamManager`, `canAccessTeam`
- Tests asserting on `user.role` string comparisons

## Out of Scope

- Per-organization custom permissions (future extension via scoped resolvers)
- Removing the `user.role` column from the database (separate migration)
- Changes to `assertOrganizationAccess`, `assertTeamAccess`, `buildTeamFilter` (data scoping, not authorization)
