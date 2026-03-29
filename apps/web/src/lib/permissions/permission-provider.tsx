"use client";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Role } from "./types";

interface PermissionContextValue {
  role: Role;
  permissions: Set<string>;
}

const PermissionCtx = createContext<PermissionContextValue | null>(null);

// Accept permissionKeys as string[] (serializable), reconstruct Set on client
export function PermissionProvider({
  role,
  permissionKeys,
  children,
}: {
  role: Role;
  permissionKeys: string[];
  children: ReactNode;
}) {
  const value = useMemo<PermissionContextValue>(
    () => ({ role, permissions: new Set(permissionKeys) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [role, permissionKeys.length],
  );
  return (
    <PermissionCtx.Provider value={value}>{children}</PermissionCtx.Provider>
  );
}

export function usePermissionContext(): PermissionContextValue {
  const ctx = useContext(PermissionCtx);
  if (!ctx)
    throw new Error(
      "usePermissionContext must be used within a PermissionProvider",
    );
  return ctx;
}
