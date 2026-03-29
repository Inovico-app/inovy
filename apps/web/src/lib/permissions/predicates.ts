/**
 * Predicate Builders
 *
 * Composable permission predicates for synchronous and asynchronous checks.
 * Predicates can be combined using `all`, `any`, and `not` combinators.
 */

import { ROLE_HIERARCHY } from "@/lib/permissions/types";
import type {
  PermissionKey,
  PermissionSubject,
  PermissionContext,
  Role,
} from "@/lib/permissions/types";
import { roleHasPermission } from "@/lib/permissions/policy-map";
import type { ScopeResolverRegistry } from "@/lib/permissions/resolvers/types";

// ---------------------------------------------------------------------------
// Core interface
// ---------------------------------------------------------------------------

export interface PermissionPredicate {
  check(subject: PermissionSubject, context?: PermissionContext): boolean;
  resolve(
    subject: PermissionSubject,
    context?: PermissionContext,
  ): Promise<boolean>;
  readonly label: string;
}

// ---------------------------------------------------------------------------
// hasRole — hierarchical "at least this role" check
// ---------------------------------------------------------------------------

/**
 * Returns a predicate that passes when the subject's role has equal or higher
 * privilege than `minimumRole` according to ROLE_HIERARCHY.
 */
export function hasRole(minimumRole: Role): PermissionPredicate {
  const minimum = ROLE_HIERARCHY[minimumRole];

  function check(subject: PermissionSubject): boolean {
    const level = ROLE_HIERARCHY[subject.role];
    return level !== undefined && level >= minimum;
  }

  return {
    label: `hasRole(${minimumRole})`,
    check,
    resolve: async (subject, _context) => check(subject),
  };
}

// ---------------------------------------------------------------------------
// hasExactRole — exact membership check
// ---------------------------------------------------------------------------

/**
 * Returns a predicate that passes only when the subject's role is exactly one
 * of the provided roles (no hierarchy).
 */
export function hasExactRole(...roles: Role[]): PermissionPredicate {
  const allowed = new Set<Role>(roles);
  const label = `hasExactRole(${roles.join(", ")})`;

  function check(subject: PermissionSubject): boolean {
    return allowed.has(subject.role);
  }

  return {
    label,
    check,
    resolve: async (subject, _context) => check(subject),
  };
}

// ---------------------------------------------------------------------------
// can — static policy map check
// ---------------------------------------------------------------------------

/**
 * Returns a predicate that uses the static POLICY_MAP to determine whether
 * the subject's role grants `permission`. Both `check` and `resolve` are sync.
 */
export function can(permission: PermissionKey): PermissionPredicate {
  function check(subject: PermissionSubject): boolean {
    return roleHasPermission(subject.role, permission);
  }

  return {
    label: `can(${permission})`,
    check,
    resolve: async (subject, _context) => check(subject),
  };
}

// ---------------------------------------------------------------------------
// scoped — scope-resolver backed check
// ---------------------------------------------------------------------------

/**
 * Extracts the scope name from a permission key ("team:read" → "team").
 */
function extractScope(permission: PermissionKey): string {
  return permission.split(":")[0] ?? permission;
}

/**
 * Returns a predicate for scope-resolved permission checks.
 *
 * - `check()` falls back to a role-only approximation (hasRole("user")).
 * - `resolve()` looks up the scope resolver in `registry` and calls it.
 *   Returns `false` when no registry or no matching resolver is found.
 */
export function scoped(
  permission: PermissionKey,
  registry?: ScopeResolverRegistry,
): PermissionPredicate {
  const scope = extractScope(permission);
  const fallback = hasRole("user");

  return {
    label: `scoped(${permission})`,
    check(subject, context) {
      return fallback.check(subject, context);
    },
    async resolve(subject, context) {
      if (!registry) return false;
      const resolver = registry.get(scope);
      if (!resolver) return false;
      return resolver.resolve(subject, context ?? {});
    },
  };
}

// ---------------------------------------------------------------------------
// Combinators
// ---------------------------------------------------------------------------

/**
 * Returns a predicate that passes only when all provided predicates pass.
 * Short-circuits on the first failure.
 */
export function all(...predicates: PermissionPredicate[]): PermissionPredicate {
  return {
    label: `all(${predicates.map((p) => p.label).join(", ")})`,
    check(subject, context) {
      for (const predicate of predicates) {
        if (!predicate.check(subject, context)) return false;
      }
      return true;
    },
    async resolve(subject, context) {
      for (const predicate of predicates) {
        const result = await predicate.resolve(subject, context);
        if (!result) return false;
      }
      return true;
    },
  };
}

/**
 * Returns a predicate that passes when any of the provided predicates pass.
 * Short-circuits on the first success.
 */
export function any(...predicates: PermissionPredicate[]): PermissionPredicate {
  return {
    label: `any(${predicates.map((p) => p.label).join(", ")})`,
    check(subject, context) {
      for (const predicate of predicates) {
        if (predicate.check(subject, context)) return true;
      }
      return false;
    },
    async resolve(subject, context) {
      for (const predicate of predicates) {
        const result = await predicate.resolve(subject, context);
        if (result) return true;
      }
      return false;
    },
  };
}

/**
 * Returns a predicate that inverts the result of the provided predicate.
 */
export function not(predicate: PermissionPredicate): PermissionPredicate {
  return {
    label: `not(${predicate.label})`,
    check(subject, context) {
      return !predicate.check(subject, context);
    },
    async resolve(subject, context) {
      const result = await predicate.resolve(subject, context);
      return !result;
    },
  };
}
