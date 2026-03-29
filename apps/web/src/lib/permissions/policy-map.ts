/**
 * Static Policy Map
 *
 * Derives a static `Record<RoleName, Set<PermissionKey>>` from the Better Auth
 * role definitions in `access-control.ts`. Enables sync permission lookups
 * without any API calls.
 */

import { roles, type RoleName } from "@/lib/auth/access-control";
import type { PermissionKey } from "@/lib/permissions/types";

/**
 * Build a flat Set<PermissionKey> from the `.statements` property of a Better Auth role.
 * The statements object maps resource names to arrays of allowed actions.
 * e.g. { project: ["create", "read"], superadmin: ["all"] }
 * produces  Set { "project:create", "project:read", "superadmin:all" }
 */
function buildPermissionSet(
  statements: Record<string, readonly string[]>,
): Set<PermissionKey> {
  const set = new Set<PermissionKey>();
  for (const [resource, actions] of Object.entries(statements)) {
    for (const action of actions) {
      set.add(`${resource}:${action}` as PermissionKey);
    }
  }
  return set;
}

/**
 * Static policy map — computed once at module load time.
 *
 * Maps every role name to the set of `"resource:action"` permission keys
 * that role is granted. Keys with empty action arrays are omitted.
 */
export const POLICY_MAP: Record<RoleName, Set<PermissionKey>> = (() => {
  const map = {} as Record<RoleName, Set<PermissionKey>>;
  for (const [roleName, role] of Object.entries(roles) as [
    RoleName,
    { statements: Record<string, readonly string[]> },
  ][]) {
    map[roleName] = buildPermissionSet(role.statements);
  }
  return map;
})();

/**
 * Synchronously check whether `role` is granted `permission`.
 *
 * @example
 * roleHasPermission("viewer", "project:read")  // true
 * roleHasPermission("viewer", "project:delete") // false
 */
export function roleHasPermission(
  role: RoleName,
  permission: PermissionKey,
): boolean {
  return POLICY_MAP[role].has(permission);
}

/**
 * Return a fresh copy of the permission set for `role`.
 * The copy is safe to mutate; it does not affect the static map.
 */
export function computePermissionSet(role: RoleName): Set<PermissionKey> {
  return new Set(POLICY_MAP[role]);
}
