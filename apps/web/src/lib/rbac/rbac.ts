/**
 * Role-Based Access Control (RBAC) utilities
 * Uses Better Auth's access control plugin for permission management
 * All functions use Better Auth's permission format directly
 */

import { TeamQueries } from "@/server/data-access/teams.queries";
import { type BetterAuthUser } from "../auth";
import type { BetterAuthMember } from "../better-auth-session";

/**
 * Better Auth permission format
 * Matches the structure defined in access-control.ts
 */
export type Permission = Record<string, string[]>;

/**
 * Better Auth organization role types
 */
export type BetterAuthOrgRole = "owner" | "admin" | "member";

/**
 * Extended session interface with roles and organization context
 * Compatible with Better Auth session structure
 */
export interface SessionWithRoles {
  user: BetterAuthUser;
  accessToken?: string;
  organizationId?: string;
  member?: BetterAuthMember | null; // Better Auth organization member info
}

/**
 * Verify that a user has access to a specific organization
 * This checks that the user's organization matches the requested organization
 *
 * @param userOrgId - The user's organization ID
 * @param requestedOrgId - The organization ID being requested
 * @returns boolean indicating if access is allowed
 */
export function verifyOrganizationAccess(
  userOrgId: string | null | undefined,
  requestedOrgId: string | null | undefined
): boolean {
  if (!userOrgId || !requestedOrgId) {
    return false;
  }

  return userOrgId === requestedOrgId;
}

/**
 * Check if a user is a viewer
 */
export function isViewer(user: BetterAuthUser) {
  return user.role === "viewer";
}

/**
 * Check if a user is a user
 */
export function isUser(user: BetterAuthUser) {
  return user.role === "user";
}

/**
 * Check if a user is an owner
 */
export function isOwner(user: BetterAuthUser) {
  return user.role === "owner";
}

/**
 * Check if a user is an admin
 */
export function isAdmin(user: BetterAuthUser) {
  return user.role === "admin";
}

/**
 * Check if a user is an organization admin
 * Alias for isAdmin for better semantic clarity
 */
export function isOrganizationAdmin(user: BetterAuthUser) {
  return isAdmin(user) || isOwner(user) || isSuperAdmin(user);
}

/**
 * Check if a user is a team manager/lead for a specific team
 * Checks if user has manager role OR is a member of the specified team
 */
export async function isTeamManager(
  user: BetterAuthUser,
  teamId: string
): Promise<boolean> {
  // Organization admins and owners can manage all teams
  if (isOrganizationAdmin(user)) {
    return true;
  }

  // Check if user has manager role
  if (user.role === "manager") {
    return true;
  }

  // Check if user is a member of this specific team
  try {
    const teamMembers = await TeamQueries.selectTeamMembers(teamId);
    return teamMembers.some((member) => member.userId === user.id);
  } catch {
    return false;
  }
}

/**
 * Check if a user can access a specific team
 * User must be a member of the team or an organization admin
 */
export async function canAccessTeam(
  user: BetterAuthUser,
  teamId: string
): Promise<boolean> {
  // Organization admins can access all teams
  if (isOrganizationAdmin(user)) {
    return true;
  }

  // Check if user is a member of this team
  try {
    const teamMembers = await TeamQueries.selectTeamMembers(teamId);
    return teamMembers.some((member) => member.userId === user.id);
  } catch {
    return false;
  }
}

/**
 * Check if a user has superadmin role
 * Superadmins can manage all organizations in the system
 */
export function isSuperAdmin(user: BetterAuthUser) {
  return user.role === "superadmin";
}

/**
 * Check if a user can access organization chat
 * Only admins, owners, and users can access organization chat
 */
export function canAccessOrganizationChat(user: BetterAuthUser): boolean {
  return (
    isOrganizationAdmin(user) || user.role === "user" || user.role === "manager"
  );
}

/**
 * Check if a user is a project manager for a specific project
 * For now, we'll check if they're an organization admin or have manager role
 * This can be expanded later to check project-specific permissions
 */
export async function isProjectManager(
  user: BetterAuthUser,
  _projectId: string
): Promise<boolean> {
  return isOrganizationAdmin(user) || user.role === "manager";
}

