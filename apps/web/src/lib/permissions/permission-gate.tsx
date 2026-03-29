"use client";
import type { ReactNode } from "react";
import { usePermissions } from "./use-permissions";
import type { PermissionKey, Role } from "./types";

/**
 * Declarative permission gate for conditional rendering.
 * Uses sync check() only — scoped predicates fall back to role-only approximation.
 * Server-side requirePermission() is the authoritative enforcement point.
 *
 * Either `permission` or `minimumRole` must be provided.
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
  if (process.env.NODE_ENV !== "production" && !permission && !minimumRole) {
    console.error(
      "PermissionGate: either `permission` or `minimumRole` must be provided",
    );
  }

  const { can, hasRole } = usePermissions();
  const allowed = permission
    ? can(permission)
    : minimumRole
      ? hasRole(minimumRole)
      : false;
  return allowed ? <>{children}</> : <>{fallback}</>;
}
