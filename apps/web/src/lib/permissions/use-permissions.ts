"use client";
import { usePermissionContext } from "./permission-provider";
import type { PermissionKey, Role } from "./types";
import { ROLE_HIERARCHY } from "./types";

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
