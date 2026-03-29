/**
 * Permission Presets
 *
 * Pre-defined, reusable permission predicates built on top of the `permissions`
 * singleton. Import these directly instead of constructing ad-hoc predicates
 * throughout the codebase.
 */

import { permissions } from "@/lib/permissions/engine";

// ---------------------------------------------------------------------------
// Role checks
// ---------------------------------------------------------------------------

/** Passes for any role at or above "admin" in the hierarchy. */
export const isAdmin = permissions.hasRole("admin");

/** Passes for any role at or above "manager" in the hierarchy. */
export const isManager = permissions.hasRole("manager");

/** Passes only for the exact "superadmin" role (no hierarchy). */
export const isSuperAdmin = permissions.hasExactRole("superadmin");

// ---------------------------------------------------------------------------
// Team access
// ---------------------------------------------------------------------------

/**
 * Passes when the subject is an admin (by role hierarchy) OR is a scoped
 * member of the team (resolved via `teamScopeResolver`).
 */
export const canAccessTeam = permissions.any(
  permissions.hasRole("admin"),
  permissions.scoped("team:read"),
);

/**
 * Passes when the subject is an admin OR is a manager with team membership.
 */
export const canManageTeam = permissions.any(
  permissions.hasRole("admin"),
  permissions.all(
    permissions.hasRole("manager"),
    permissions.scoped("team:read"),
  ),
);

// ---------------------------------------------------------------------------
// Project access
// ---------------------------------------------------------------------------

/**
 * Passes when the subject is an admin (by role hierarchy) OR is a scoped
 * member of the project's team (resolved via `projectScopeResolver`).
 */
export const canAccessProject = permissions.any(
  permissions.hasRole("admin"),
  permissions.scoped("project:read"),
);

// ---------------------------------------------------------------------------
// Chat access
// ---------------------------------------------------------------------------

/** Passes for any role at or above "user" in the hierarchy. */
export const canAccessChat = permissions.hasRole("user");
