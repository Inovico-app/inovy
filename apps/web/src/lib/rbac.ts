/**
 * Role-Based Access Control (RBAC) utilities
 * Provides authorization logic for server actions
 */

import type { AuthUser } from "./auth";

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
  ],
  [ROLES.VIEWER]: [
    "projects:read",
    "recordings:read",
    "tasks:read",
    "users:read",
    "chat:project",
    "org:instructions:read",
    "settings:read",
  ],
};

/**
 * Extended session interface with roles and organization context
 */
export interface SessionWithRoles {
  user: AuthUser & {
    roles?: Role[];
  };
  accessToken?: string;
  organizationId?: string; // Organization code from Kinde
}

/**
 * Get user roles from AuthUser
 * Returns roles from user object or defaults to USER
 */
function getUserRoles(user: AuthUser): Role[] {
  if (!user.roles) {
    return [ROLES.USER];
  }
  // Convert string array to Role enum values
  return user.roles.map((role) => {
    const roleValue = Object.values(ROLES).find((r) => r === role);
    return roleValue ?? ROLES.USER;
  });
}

/**
 * Check if a user is authorized to perform a specific action
 */
export function userIsAuthorized(
  session: SessionWithRoles,
  policy: PolicyKey
): { isAuthorized: boolean; requiredRoles: Role[] } {
  const userRoles = session.user.roles ?? getUserRoles(session.user);

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
 */
export function userHasRole(session: SessionWithRoles, role: Role): boolean {
  const userRoles = session.user.roles ?? getUserRoles(session.user);
  return userRoles.includes(role);
}

/**
 * Check if a user has any of the specified roles
 */
export function userHasAnyRole(
  session: SessionWithRoles,
  roles: Role[]
): boolean {
  const userRoles = session.user.roles ?? getUserRoles(session.user);
  return roles.some((role) => userRoles.includes(role));
}

/**
 * Get all policies a user has access to
 */
export function getUserPolicies(session: SessionWithRoles): PolicyKey[] {
  const userRoles = session.user.roles ?? getUserRoles(session.user);

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
 */
export function isOrganizationAdmin(
  user: AuthUser | (AuthUser & { roles: Role[] })
): boolean {
  const roles = user.roles ?? getUserRoles(user);
  return roles.includes(ROLES.ADMIN) || roles.includes(ROLES.SUPER_ADMIN);
}

/**
 * Check if a user is a project manager
 * This is a convenience method that checks if the user has the MANAGER role
 */
export function isProjectManager(
  user: AuthUser | (AuthUser & { roles: Role[] })
): boolean {
  const roles = user.roles ?? getUserRoles(user);
  return roles.includes(ROLES.MANAGER) || roles.includes(ROLES.ADMIN) || roles.includes(ROLES.SUPER_ADMIN);
}

/**
 * Check if a user can access organization-level chat
 */
export function canAccessOrganizationChat(
  user: AuthUser | (AuthUser & { roles: Role[] })
): boolean {
  return isOrganizationAdmin(user);
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
  const userOrgId = session.organizationId ?? session.user.organization_code;
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
 * Tries multiple sources to ensure compatibility
 *
 * @param session - The user session
 * @returns Organization ID or undefined
 */
export function getOrganizationIdFromSession(
  session: SessionWithRoles
): string | undefined {
  return session.organizationId ?? session.user.organization_code ?? undefined;
}

