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
  owner: 5, // owner maps to admin in access-control.ts — same privilege level
  manager: 3,
  user: 2,
  viewer: 1,
};

/**
 * Validate that a string is a known role. Returns false for unknown roles.
 */
export function isValidRole(role: string): role is Role {
  return role in ROLE_HIERARCHY;
}

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
