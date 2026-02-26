/**
 * RBAC Module Exports
 * Centralized exports for Role-Based Access Control system
 *
 * This module provides a structured authorization system using authorization groups
 * as required by SSD-7.1.01.
 */

// Authorization Groups (SSD-7.1.01)
export {
  AuthorizationGroups,
  AuthorizationGroupCategories,
  RoleAuthorizationGroups,
  AuthorizationLevels,
  getAuthorizationGroupsForRole,
  getPermissionsForRole,
  roleHasAuthorizationGroup,
  getAuthorizationGroupsByCategory,
  type AuthorizationGroup,
  type AuthorizationGroupCategory,
  type AuthorizationLevel,
  type RoleName as AuthGroupRoleName,
} from "./authorization-groups";

// Access Control
export { ac, roles, roleMapping, type RoleName, type BetterAuthRole } from "../auth/access-control";

// Permissions
export { Permissions, type Permission, type Permissions as PermissionsType } from "./permissions";

// Permission Checks
export { checkPermission } from "./permissions-server";
export { checkPermissionClient, checkRolePermission } from "./permissions-client";

// RBAC Utilities
export {
  verifyOrganizationAccess,
  isViewer,
  isUser,
  isOwner,
  isAdmin,
  isOrganizationAdmin,
  isSuperAdmin,
  canAccessOrganizationChat,
  isTeamManager,
  canAccessTeam,
  isProjectManager,
  type SessionWithRoles,
  type Permission as RBACPermission,
  type BetterAuthOrgRole,
} from "./rbac";

// Organization Isolation
export {
  assertOrganizationAccess,
  filterByOrganization,
  getOrganizationFromSession,
  verifyResourceOrganization,
  validateOrganizationContext,
  batchVerifyOrganization,
} from "./organization-isolation";

// Legacy Helpers
export { policyToPermissions } from "./permission-helpers";
