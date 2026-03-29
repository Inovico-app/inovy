/**
 * Permission Engine
 *
 * Factory for creating a `PermissionEngine` that wraps the predicate builders
 * and wires up a `ScopeResolverRegistry` for scoped permission checks.
 *
 * The exported `permissions` singleton has the team and project resolvers
 * pre-registered and is the primary entry point for all permission checks.
 */

import {
  hasRole,
  hasExactRole,
  can,
  scoped,
  all,
  any,
  not,
} from "@/lib/permissions/predicates";
import type { PermissionPredicate } from "@/lib/permissions/predicates";
import type { PermissionKey, Role } from "@/lib/permissions/types";
import { ScopeResolverRegistry } from "@/lib/permissions/resolvers/types";
import type { ScopeResolver } from "@/lib/permissions/resolvers/types";
import { teamScopeResolver } from "@/lib/permissions/resolvers/team-resolver";
import { projectScopeResolver } from "@/lib/permissions/resolvers/project-resolver";

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface PermissionEngine {
  hasRole(minimumRole: Role): PermissionPredicate;
  hasExactRole(...roles: Role[]): PermissionPredicate;
  can(permission: PermissionKey): PermissionPredicate;
  scoped(permission: PermissionKey): PermissionPredicate;
  all(...predicates: PermissionPredicate[]): PermissionPredicate;
  any(...predicates: PermissionPredicate[]): PermissionPredicate;
  not(predicate: PermissionPredicate): PermissionPredicate;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

interface PermissionEngineConfig {
  resolvers?: ScopeResolver[];
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates a `PermissionEngine` with an internal `ScopeResolverRegistry`.
 * All provided resolvers are registered at construction time.
 */
export function createPermissionEngine(
  config: PermissionEngineConfig = {},
): PermissionEngine {
  const registry = new ScopeResolverRegistry();

  for (const resolver of config.resolvers ?? []) {
    registry.register(resolver);
  }

  return {
    hasRole(minimumRole) {
      return hasRole(minimumRole);
    },
    hasExactRole(...roles) {
      return hasExactRole(...roles);
    },
    can(permission) {
      return can(permission);
    },
    scoped(permission) {
      return scoped(permission, registry);
    },
    all(...predicates) {
      return all(...predicates);
    },
    any(...predicates) {
      return any(...predicates);
    },
    not(predicate) {
      return not(predicate);
    },
  };
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

/**
 * Singleton permission engine with team and project scope resolvers registered.
 * Use this throughout the application for all permission checks.
 */
export const permissions = createPermissionEngine({
  resolvers: [teamScopeResolver, projectScopeResolver],
});
