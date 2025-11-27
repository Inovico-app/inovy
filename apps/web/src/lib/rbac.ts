/**
 * Role-Based Access Control (RBAC) utilities
 * Provides authorization logic for server actions
 * Integrated with Better Auth organization roles
 */

import type { AuthUser } from "./auth";
import type { BetterAuthMember } from "./better-auth-session";

/**
 * Available policies in the system
 * Each policy represents a specific action or resource access
 */
export const POLICIES = {
  // Project management
  "projects:create": "projects:create",
  "projects:read": "projects:read",
  "projects:update": "projects:update",
  "projects:delete": "projects:delete",

  // Recording management
  "recordings:create": "recordings:create",
  "recordings:read": "recordings:read",
  "recordings:update": "recordings:update",
  "recordings:delete": "recordings:delete",

  // Task management
  "tasks:create": "tasks:create",
  "tasks:read": "tasks:read",
  "tasks:update": "tasks:update",
  "tasks:delete": "tasks:delete",

  // Organization management
  "organizations:create": "organizations:create",
  "organizations:read": "organizations:read",
  "organizations:update": "organizations:update",
  "organizations:delete": "organizations:delete",

  // User management
  "users:read": "users:read",
  "users:update": "users:update",
  "users:delete": "users:delete",

  // Chat management
  "chat:project": "chat:project",
  "chat:organization": "chat:organization",

  // Admin actions
  "admin:all": "admin:all",

  // Organization instructions
  "org:instructions:read": "org:instructions:read",
  "org:instructions:write": "org:instructions:write",

  // Deepgram management
  "deepgram:token": "deepgram:token",

  // Settings management
  "settings:read": "settings:read",
  "settings:update": "settings:update",

  // Integrations management
  "integrations:manage": "integrations:manage",

  // Department management
  "departments:create": "departments:create",
  "departments:read": "departments:read",
  "departments:update": "departments:update",
  "departments:delete": "departments:delete",

  // Team management
  "teams:create": "teams:create",
  "teams:read": "teams:read",
  "teams:update": "teams:update",
  "teams:delete": "teams:delete",
} as const;

export type PolicyKey = keyof typeof POLICIES;
export const POLICY_KEYS = Object.keys(POLICIES) as PolicyKey[];

/**
 * Available roles in the system
 */
export const ROLES = {
  SUPER_ADMIN: "superadmin",
  ADMIN: "admin",
  MANAGER: "manager",
  USER: "user",
  VIEWER: "viewer",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/**
 * Role to policies mapping
 * Defines which policies each role has access to
 */
const ROLE_POLICIES: Record<Role, PolicyKey[]> = {
  [ROLES.SUPER_ADMIN]: [
    "projects:create",
    "projects:read",
    "projects:update",
    "projects:delete",
    "recordings:create",
    "recordings:read",
    "recordings:update",
    "recordings:delete",
    "tasks:create",
    "tasks:read",
    "tasks:update",
    "tasks:delete",
    "organizations:create",
    "organizations:read",
    "organizations:update",
    "organizations:delete",
    "users:read",
    "users:update",
    "users:delete",
    "chat:project",
    "chat:organization",
    "admin:all",
    "org:instructions:read",
    "org:instructions:write",
    "deepgram:token",
    "settings:read",
    "settings:update",
    "integrations:manage",
    "departments:create",
    "departments:read",
    "departments:update",
    "departments:delete",
    "teams:create",
    "teams:read",
    "teams:update",
    "teams:delete",
  ],
  [ROLES.ADMIN]: [
    "projects:create",
    "projects:read",
    "projects:update",
    "projects:delete",
    "recordings:create",
    "recordings:read",
    "recordings:update",
    "recordings:delete",
    "tasks:create",
    "tasks:read",
    "tasks:update",
    "tasks:delete",
    "organizations:create",
    "organizations:read",
    "organizations:update",
    "organizations:delete",
    "users:read",
    "users:update",
    "users:delete",
    "chat:project",
    "chat:organization",
    "admin:all",
    "org:instructions:read",
    "org:instructions:write",
    "settings:read",
    "settings:update",
    "integrations:manage",
    "departments:create",
    "departments:read",
    "departments:update",
    "departments:delete",
    "teams:create",
    "teams:read",
    "teams:update",
    "teams:delete",
  ],
  [ROLES.MANAGER]: [
    "projects:create",
    "projects:read",
    "projects:update",
    "projects:delete",
    "recordings:create",
    "recordings:read",
    "recordings:update",
    "recordings:delete",
    "tasks:create",
    "tasks:read",
    "tasks:update",
    "tasks:delete",
    "organizations:read",
    "organizations:update",
    "users:read",
    "chat:project",
    "org:instructions:read",
    "settings:read",
    "settings:update",
    "integrations:manage",
    "departments:read",
    "teams:read",
  ],
  [ROLES.USER]: [
    "projects:create",
    "projects:read",
    "projects:update",
    "recordings:create",
    "recordings:read",
    "recordings:update",
    "tasks:create",
    "tasks:read",
    "tasks:update",
    "users:read",
    "chat:project",
    "org:instructions:read",
    "settings:read",
    "settings:update",
    "departments:read",
    "teams:read",
  ],
  [ROLES.VIEWER]: [
    "projects:read",
    "recordings:read",
    "tasks:read",
    "users:read",
    "chat:project",
    "org:instructions:read",
    "settings:read",
    "departments:read",
    "teams:read",
  ],
};

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
    roles?: Role[];
  };
  accessToken?: string;
  organizationId?: string;
  member?: BetterAuthMember | null; // Better Auth organization member info
}

/**
 * Map Better Auth organization role to application roles
 * Better Auth provides: owner, admin, member
 * Application roles: superadmin, admin, manager, user, viewer
 *
 * @param betterAuthRole - The Better Auth organization role
 * @returns Array of application roles
 */
export function mapBetterAuthRoleToApplicationRoles(
  betterAuthRole: BetterAuthOrgRole | string | null | undefined
): Role[] {
  if (!betterAuthRole) {
    return [ROLES.USER];
  }

  const normalizedRole = betterAuthRole.toLowerCase();

  switch (normalizedRole) {
    case "owner":
      // Organization owners get admin privileges
      return [ROLES.ADMIN];
    case "admin":
      // Organization admins get admin privileges
      return [ROLES.ADMIN];
    case "member":
      // Regular members get user privileges
      return [ROLES.USER];
    default:
      // Unknown role defaults to user
      return [ROLES.USER];
  }
}

/**
 * Extract roles from Better Auth session structure
 * Checks multiple sources: user.roles, member.role, or defaults to USER
 *
 * @param session - Session with Better Auth structure
 * @returns Array of application roles
 */
function extractRolesFromSession(session: SessionWithRoles): Role[] {
  // First, check if roles are already mapped in user.roles
  if (session.user.roles && session.user.roles.length > 0) {
    // Validate and filter roles
    return session.user.roles
      .map((role) => {
        const roleValue = Object.values(ROLES).find((r) => r === role);
        return roleValue ?? null;
      })
      .filter((role): role is Role => role !== null);
  }

  // If no roles in user, check Better Auth member role
  if (session.member?.role) {
    return mapBetterAuthRoleToApplicationRoles(session.member.role);
  }

  // Default to user role
  return [ROLES.USER];
}

/**
 * Get user roles from AuthUser or Better Auth session
 * Returns roles from user object, member role, or defaults to USER
 *
 * @param user - AuthUser object
 * @param member - Optional Better Auth member info
 * @returns Array of application roles
 */
function getUserRoles(
  user: AuthUser,
  member?: BetterAuthMember | null
): Role[] {
  // Check if roles are already set on user
  if (user.roles && user.roles.length > 0) {
    return user.roles
      .map((role) => {
        const roleValue = Object.values(ROLES).find((r) => r === role);
        return roleValue ?? ROLES.USER;
      })
      .filter((role, index, arr) => arr.indexOf(role) === index); // Remove duplicates
  }

  // If member info is available, map Better Auth role
  if (member?.role) {
    return mapBetterAuthRoleToApplicationRoles(member.role);
  }

  // Default to user role
  return [ROLES.USER];
}

/**
 * Check if a user is authorized to perform a specific action
 * Extracts roles from Better Auth session structure
 */
export function userIsAuthorized(
  session: SessionWithRoles,
  policy: PolicyKey
): { isAuthorized: boolean; requiredRoles: Role[] } {
  // Extract roles from Better Auth session structure
  const userRoles = extractRolesFromSession(session);

  // Find which roles have access to this policy
  const requiredRoles = Object.entries(ROLE_POLICIES)
    .filter(([_, policies]) => policies.includes(policy))
    .map(([role]) => role as Role);

  // Check if user has any of the required roles
  const isAuthorized = userRoles.some((userRole) =>
    requiredRoles.includes(userRole)
  );

  return { isAuthorized, requiredRoles };
}

/**
 * Check if a user has a specific role
 * Extracts roles from Better Auth session structure
 */
export function userHasRole(session: SessionWithRoles, role: Role): boolean {
  const userRoles = extractRolesFromSession(session);
  return userRoles.includes(role);
}

/**
 * Check if a user has any of the specified roles
 * Extracts roles from Better Auth session structure
 */
export function userHasAnyRole(
  session: SessionWithRoles,
  roles: Role[]
): boolean {
  const userRoles = extractRolesFromSession(session);
  return roles.some((role) => userRoles.includes(role));
}

/**
 * Get all policies a user has access to
 * Extracts roles from Better Auth session structure
 */
export function getUserPolicies(session: SessionWithRoles): PolicyKey[] {
  const userRoles = extractRolesFromSession(session);

  const policies = new Set<PolicyKey>();

  userRoles.forEach((role) => {
    const rolePolicies = ROLE_POLICIES[role] ?? [];
    rolePolicies.forEach((policy) => policies.add(policy));
  });

  return Array.from(policies);
}

/**
 * Check if a user is an organization admin
 * This is a convenience method that checks if the user has the ADMIN role
 * Works with Better Auth organization roles (owner, admin)
 */
export function isOrganizationAdmin(
  user: AuthUser | (AuthUser & { roles?: Role[] }),
  member?: BetterAuthMember | null
): boolean {
  const roles = user.roles ?? getUserRoles(user, member);
  return roles.includes(ROLES.ADMIN) || roles.includes(ROLES.SUPER_ADMIN);
}

/**
 * Check if a user is a project manager
 * This is a convenience method that checks if the user has the MANAGER role
 * Works with Better Auth organization roles
 */
export function isProjectManager(
  user: AuthUser | (AuthUser & { roles?: Role[] }),
  member?: BetterAuthMember | null
): boolean {
  const roles = user.roles ?? getUserRoles(user, member);
  return (
    roles.includes(ROLES.MANAGER) ||
    roles.includes(ROLES.ADMIN) ||
    roles.includes(ROLES.SUPER_ADMIN)
  );
}

/**
 * Check if a user can access organization-level chat
 * Works with Better Auth organization roles
 */
export function canAccessOrganizationChat(
  user: AuthUser | (AuthUser & { roles?: Role[] }),
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
 * This is a higher-level helper that combines role and organization checks
 *
 * @param session - The user session with roles
 * @param resource - The resource being accessed (must have organizationId)
 * @param policy - The policy required for this resource
 * @returns Object with authorization result and reason
 */
export function canAccessResource<T extends { organizationId: string | null }>(
  session: SessionWithRoles,
  resource: T | null,
  policy: PolicyKey
): {
  canAccess: boolean;
  reason?: string;
  requiredRoles?: Role[];
} {
  // Check if resource exists
  if (!resource) {
    return {
      canAccess: false,
      reason: "Resource not found",
    };
  }

  // Check RBAC policy authorization
  const { isAuthorized, requiredRoles } = userIsAuthorized(session, policy);

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
 * Check if a user can access a department
 * Verifies organization access and RBAC permissions
 */
export function canAccessDepartment(
  session: SessionWithRoles,
  department: { organizationId: string } | null
): {
  canAccess: boolean;
  reason?: string;
  requiredRoles?: Role[];
} {
  return canAccessResource(session, department, "departments:read");
}

/**
 * Check if a user can access a team
 * Verifies organization access and RBAC permissions
 */
export function canAccessTeam(
  session: SessionWithRoles,
  team: { organizationId: string } | null
): {
  canAccess: boolean;
  reason?: string;
  requiredRoles?: Role[];
} {
  return canAccessResource(session, team, "teams:read");
}

/**
 * Check if a user is a department admin
 * Note: This checks organization-level admin role.
 * Department-specific admin roles would require additional logic.
 * Works with Better Auth organization roles
 */
export function isDepartmentAdmin(
  user: AuthUser | (AuthUser & { roles?: Role[] }),
  member?: BetterAuthMember | null
): boolean {
  return isOrganizationAdmin(user, member);
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

