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

  // Admin actions
  "admin:all": "admin:all",
} as const;

export type PolicyKey = keyof typeof POLICIES;
export const POLICY_KEYS = Object.keys(POLICIES) as PolicyKey[];

/**
 * Available roles in the system
 */
export const ROLES = {
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
    "admin:all",
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
  ],
  [ROLES.VIEWER]: [
    "projects:read",
    "recordings:read",
    "tasks:read",
    "users:read",
  ],
};

/**
 * Extended session interface with roles
 */
export interface SessionWithRoles {
  user: AuthUser & {
    roles?: Role[];
  };
  accessToken?: string;
}

/**
 * Get user roles from Kinde (you may need to adjust this based on your Kinde setup)
 * This is a placeholder - you'll need to implement based on how Kinde provides roles
 */
function getUserRoles(user: AuthUser): Role[] {
  // For now, return a default role - you'll need to implement this based on Kinde
  // This could come from Kinde permissions, custom claims, or database lookup
  return [ROLES.USER];
}

/**
 * Check if a user is authorized to perform a specific action
 */
export function userIsAuthorized(
  session: SessionWithRoles,
  policy: PolicyKey
): { isAuthorized: boolean; requiredRoles: Role[] } {
  const userRoles = session.user.roles || getUserRoles(session.user);

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
  const userRoles = session.user.roles || getUserRoles(session.user);
  return userRoles.includes(role);
}

/**
 * Check if a user has any of the specified roles
 */
export function userHasAnyRole(
  session: SessionWithRoles,
  roles: Role[]
): boolean {
  const userRoles = session.user.roles || getUserRoles(session.user);
  return roles.some((role) => userRoles.includes(role));
}

/**
 * Get all policies a user has access to
 */
export function getUserPolicies(session: SessionWithRoles): PolicyKey[] {
  const userRoles = session.user.roles || getUserRoles(session.user);

  const policies = new Set<PolicyKey>();

  userRoles.forEach((role) => {
    const rolePolicies = ROLE_POLICIES[role] || [];
    rolePolicies.forEach((policy) => policies.add(policy));
  });

  return Array.from(policies);
}

