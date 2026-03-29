"use client";
import type { ReactNode } from "react";
import { usePermissions } from "./use-permissions";
import type { PermissionKey, Role } from "./types";

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
