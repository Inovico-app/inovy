/**
 * Role-Based Access Control (RBAC) utilities
 * Uses Better Auth's access control plugin for permission management
 * All functions use Better Auth's permission format directly
 */

import { headers } from "next/headers";
import { auth } from "../auth";
import { roles, type RoleName } from "../auth/access-control";
import type { AuthUser } from "../auth/auth-helpers";
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
  user: AuthUser & {
    roles?: RoleName[];
  };
  accessToken?: string;
  organizationId?: string;
  member?: BetterAuthMember | null; // Better Auth organization member info
}

/**
 * Get user's Better Auth role from session
 * Maps Better Auth organization roles to application roles
 */
function getUserBetterAuthRole(session: SessionWithRoles): RoleName | null {
  // Check if roles are already set on user
  if (session.user.roles && session.user.roles.length > 0) {
    const role = session.user.roles[0] as RoleName;
    if (role in roles) {
      return role;
    }
  }

  // If member info is available, map Better Auth role
  if (session.member?.role) {
    const betterAuthRole =
      session.member.role.toLowerCase() as BetterAuthOrgRole;
    if (betterAuthRole === "owner" || betterAuthRole === "admin") {
      return "admin";
    }
    if (betterAuthRole === "member") {
      return "user";
    }
  }

  // Default to user role
  return "user";
}

/**
 * Check if a user is authorized to perform a specific action
 * Uses Better Auth's built-in hasPermission API
 *
 * @param session - User session
 * @param permissions - Better Auth permission format, e.g., { project: ["create"] }
 * @returns Authorization result with required roles for error messages
 */
export async function userIsAuthorized(
  permissions: Permission
): Promise<{ isAuthorized: boolean; requiredRoles: RoleName[] }> {
  try {
    console.log("CHECKING PERMISSIONS:", permissions);
    // Use Better Auth's built-in API to check permissions for the current user
    const result = await auth.api.hasPermission({
      headers: await headers(),
      body: {
        permissions,
      },
    });

    const isAuthorized = result?.success === true;

    // Find which roles have access to these permissions (for error messages)
    const requiredRoles: RoleName[] = [];
    for (const roleName of Object.keys(roles) as RoleName[]) {
      const role = roles[roleName];
      if (!role) continue;

      // Check if role has the required permissions
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const roleObj = role as any;
      let hasAllPermissions = true;

      for (const [resource, requiredActions] of Object.entries(permissions)) {
        const roleResourcePermissions = roleObj[resource] as
          | string[]
          | undefined;
        if (!roleResourcePermissions || roleResourcePermissions.length === 0) {
          hasAllPermissions = false;
          break;
        }

        for (const action of requiredActions) {
          if (!roleResourcePermissions.includes(action)) {
            hasAllPermissions = false;
            break;
          }
        }

        if (!hasAllPermissions) break;
      }

      if (hasAllPermissions) {
        requiredRoles.push(roleName);
      }
    }

    return { isAuthorized, requiredRoles };
  } catch {
    // If API call fails, return false
    return { isAuthorized: false, requiredRoles: [] };
  }
}

/**
 * Check if a user has a specific role
 */
export function userHasRole(
  session: SessionWithRoles,
  role: RoleName
): boolean {
  const userRole = getUserBetterAuthRole(session);
  return userRole === role;
}

/**
 * Check if a user has any of the specified roles
 */
export function userHasAnyRole(
  session: SessionWithRoles,
  rolesToCheck: RoleName[]
): boolean {
  const userRole = getUserBetterAuthRole(session);
  if (!userRole) {
    return false;
  }
  return rolesToCheck.includes(userRole);
}

/**
 * Check if a user is an organization admin
 * Works with Better Auth organization roles (owner, admin)
 */
export function isOrganizationAdmin(
  user: AuthUser | (AuthUser & { roles?: RoleName[] }),
  member?: BetterAuthMember | null
): boolean {
  // Create a temporary session to check role
  const session: SessionWithRoles = {
    user: user as SessionWithRoles["user"],
    member: member ?? null,
  };

  const userRole = getUserBetterAuthRole(session);
  return userRole === "admin" || userRole === "superadmin";
}

/**
 * Check if a user is a project manager
 * Works with Better Auth organization roles
 */
export function isProjectManager(
  user: AuthUser | (AuthUser & { roles?: RoleName[] }),
  member?: BetterAuthMember | null
): boolean {
  // Create a temporary session to check role
  const session: SessionWithRoles = {
    user: user as SessionWithRoles["user"],
    member: member ?? null,
  };

  const userRole = getUserBetterAuthRole(session);
  return (
    userRole === "manager" || userRole === "admin" || userRole === "superadmin"
  );
}

/**
 * Check if a user can access organization-level chat
 * Works with Better Auth organization roles
 */
export function canAccessOrganizationChat(
  user: AuthUser | (AuthUser & { roles?: RoleName[] }),
  member?: BetterAuthMember | null
): boolean {
  return isOrganizationAdmin(user, member);
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
 * Check if a user can access a specific resource based on organization
 * This is a higher-level helper that combines permission and organization checks
 *
 * @param session - The user session with roles
 * @param resource - The resource being accessed (must have organizationId)
 * @param permissions - Better Auth permission format, e.g., { project: ["read"] }
 * @returns Object with authorization result and reason
 */
export async function canAccessResource<
  T extends { organizationId: string | null },
>(
  session: SessionWithRoles,
  resource: T | null,
  permissions: Permission
): Promise<{
  canAccess: boolean;
  reason?: string;
  requiredRoles?: RoleName[];
}> {
  // Check if resource exists
  if (!resource) {
    return {
      canAccess: false,
      reason: "Resource not found",
    };
  }

  // Check RBAC permission authorization using Better Auth's built-in API
  const { isAuthorized, requiredRoles } = await userIsAuthorized(permissions);

  if (!isAuthorized) {
    return {
      canAccess: false,
      reason: "Insufficient permissions",
      requiredRoles,
    };
  }

  // Check organization isolation
  // Extract organization ID from Better Auth session structure
  const userOrgId =
    session.organizationId ??
    session.member?.organizationId ??
    session.user.organization_code;
  if (!verifyOrganizationAccess(userOrgId, resource.organizationId)) {
    return {
      canAccess: false,
      reason: "Resource not found", // Use same message as not found to prevent info leakage
    };
  }

  return {
    canAccess: true,
  };
}

/**
 * Extract organization ID from session
 * Tries multiple sources to ensure compatibility with Better Auth session structure
 *
 * @param session - The user session
 * @returns Organization ID or undefined
 */
export function getOrganizationIdFromSession(
  session: SessionWithRoles
): string | undefined {
  return (
    session.organizationId ??
    session.member?.organizationId ??
    session.user.organization_code ??
    undefined
  );
}

/**
 * Check if a user can access a team
 * Verifies organization access and RBAC permissions
 */
export async function canAccessTeam(
  session: SessionWithRoles,
  team: { organizationId: string } | null
): Promise<{
  canAccess: boolean;
  reason?: string;
  requiredRoles?: RoleName[];
}> {
  return canAccessResource(session, team, { team: ["read"] });
}

/**
 * Check if a user is a team admin
 * Checks if user has team admin role in user-teams table
 * This is a basic check - actual implementation requires querying user-teams
 */
export function isTeamAdmin(userTeamRole: string | null | undefined): boolean {
  return userTeamRole === "admin";
}

/**
 * Check if a user is a team lead
 * Checks if user has team lead role in user-teams table
 */
export function isTeamLead(userTeamRole: string | null | undefined): boolean {
  return userTeamRole === "lead" || userTeamRole === "admin";
}

/**
 * Check if a user has superadmin role
 * Superadmins can manage all organizations in the system
 */
export function isSuperAdmin(session: SessionWithRoles): boolean {
  const userRole = getUserBetterAuthRole(session);
  return userRole === "superadmin";
}

/**
 * Check if a user can manage a team
 * User can manage a team if they are:
 * 1. Organization admin, OR
 * 2. Team manager (member of the team with lead/admin role)
 * 
 * Note: This function checks org-level permissions only.
 * For team-level membership checks, use isTeamManager()
 */
export async function canManageTeam(
  session: SessionWithRoles,
  teamId: string
): Promise<boolean> {
  // Organization admins can manage all teams
  if (isOrganizationAdmin(session.user, session.member)) {
    return true;
  }

  // Check if user is a team manager for this specific team
  return isTeamManagerForTeam(session, teamId);
}

/**
 * Check if a user is a team manager for a specific team
 * Queries the team_members table to verify membership and role
 * 
 * Note: This is a database query - use sparingly
 * Better Auth doesn't natively support team member roles,
 * so we'll need to implement custom logic when we use this
 */
export async function isTeamManagerForTeam(
  session: SessionWithRoles,
  teamId: string
): Promise<boolean> {
  // Import at function level to avoid circular dependencies
  const { db } = await import("@/server/db");
  const { teamMembers } = await import("@/server/db/schema/auth");
  const { eq, and } = await import("drizzle-orm");

  try {
    const userId = session.user.id;
    
    // Query team_members table
    const membership = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.userId, userId),
          eq(teamMembers.teamId, teamId)
        )
      )
      .limit(1);

    // Better Auth's team_members table doesn't have a role field
    // Just check if user is a member
    // For now, all team members are considered managers
    return membership.length > 0;
  } catch (error) {
    console.error("Error checking team manager status:", error);
    return false;
  }
}

