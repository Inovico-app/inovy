/**
 * Better Auth Access Control Configuration
 * Defines resources, actions, and roles for RBAC using Better Auth's access control plugin
 *
 * SSD-7.1.01 Compliance: Authorization Groups Structure
 * This file defines the foundational access control statements that are organized
 * into authorization groups in authorization-groups.ts for better manageability.
 */

import { createAccessControl } from "better-auth/plugins/access";

/**
 * Access control statements defining all resources and their available actions
 * Organized by functional category for clarity and maintainability
 *
 * Authorization Groups (defined in authorization-groups.ts) use these resources
 * to create manageable permission sets that can be assigned to roles.
 */
const statement = {
  /**
   * Content Management Resources
   * Core content types that users create and manage
   */

  // Project management
  project: ["create", "read", "update", "delete"],

  // Recording management
  recording: ["create", "read", "update", "delete"],

  // Task management
  task: ["create", "read", "update", "delete"],

  /**
   * Organization Administration Resources
   * Organization-level configuration and structure
   */

  // Organization management
  organization: ["create", "list", "read", "update", "delete"],

  // Team management
  team: ["create", "read", "update", "delete"],

  // Settings management
  setting: ["read", "update"],

  // Organization instructions
  orgInstruction: ["read", "write"],

  /**
   * User Management Resources
   * User accounts and invitations
   */

  // User management
  user: ["create", "read", "update", "delete"],

  // Invitation management
  invitation: ["create", "cancel"],

  // Onboarding management
  onboarding: ["create", "read", "update", "complete"],

  /**
   * System Administration Resources
   * System-level operations and monitoring
   */

  // Superadmin actions (cross-organization)
  superadmin: ["all"],

  // Admin actions (organization-scoped)
  admin: ["all"],

  // Audit log management
  "audit-log": ["read"],

  /**
   * Integration Management Resources
   * Third-party services and integrations
   */

  // Integrations management
  integration: ["manage"],

  // Deepgram management
  deepgram: ["token"],

  /**
   * Communication Resources
   * Chat and messaging features
   */

  // Chat management
  chat: ["project", "organization"],
} as const;

/**
 * Create access control instance
 */
export const ac = createAccessControl(statement);

/**
 * Define roles with their permissions
 * Maps Better Auth organization roles (owner, admin, member) to application permissions
 *
 * These role definitions implement the authorization groups defined in authorization-groups.ts
 * Each role is systematically assigned permissions based on their authorization group memberships.
 *
 * See authorization-groups.ts for the complete authorization group structure and
 * AUTHORIZATION_GROUPS.md for detailed documentation and compliance information.
 */

/**
 * Super Admin Role
 *
 * Authorization Groups:
 * - System: SUPERADMIN_FULL, ADMIN_FULL, AUDIT_LOG_READER
 * - Organization: ORG_FULL, ORG_INSTRUCTION_WRITER
 * - Content: CONTENT_FULL_ACCESS
 * - User: USER_FULL, INVITATION_MANAGER
 * - Integration: INTEGRATION_FULL (includes DEEPGRAM_ACCESS)
 * - Communication: CHAT_FULL
 *
 * Scope: Cross-organization system access
 * Use Case: Platform administration, system configuration
 */
export const superAdmin = ac.newRole({
  project: ["create", "read", "update", "delete"],
  recording: ["create", "read", "update", "delete"],
  task: ["create", "read", "update", "delete"],
  organization: ["create", "list", "read", "update", "delete"],
  user: ["create", "read", "update", "delete"],
  chat: ["project", "organization"],
  superadmin: ["all"],
  admin: ["all"],
  orgInstruction: ["read", "write"],
  deepgram: ["token"],
  setting: ["read", "update"],
  integration: ["manage"],
  team: ["create", "read", "update", "delete"],
  "audit-log": ["read"],
  onboarding: ["create", "read", "update", "complete"],
  invitation: ["create", "cancel"],
});

/**
 * Admin Role
 *
 * Authorization Groups:
 * - System: ADMIN_FULL, AUDIT_LOG_READER
 * - Organization: ORG_FULL, ORG_INSTRUCTION_WRITER
 * - Content: CONTENT_FULL_ACCESS
 * - User: USER_FULL, INVITATION_MANAGER
 * - Integration: INTEGRATION_MANAGER (no DEEPGRAM_ACCESS)
 * - Communication: CHAT_FULL
 *
 * Scope: Full access within organization
 * Use Case: Organization administration, user management, content oversight
 */
export const admin = ac.newRole({
  project: ["create", "read", "update", "delete"],
  recording: ["create", "read", "update", "delete"],
  task: ["create", "read", "update", "delete"],
  organization: ["create", "read", "update", "delete"],
  user: ["create", "read", "update", "delete"],
  chat: ["project", "organization"],
  admin: ["all"],
  orgInstruction: ["read", "write"],
  deepgram: [], // No deepgram access for admin (superadmin only)
  setting: ["read", "update"],
  integration: ["manage"],
  team: ["create", "read", "update", "delete"],
  "audit-log": ["read"],
  onboarding: ["create", "read", "update", "complete"],
  invitation: ["create", "cancel"],
});

/**
 * Manager Role
 *
 * Authorization Groups:
 * - Organization: ORG_SETTINGS_MANAGER, TEAM_VIEWER, ORG_INSTRUCTION_READER
 * - Content: CONTENT_FULL_ACCESS
 * - User: USER_VIEWER, INVITATION_MANAGER
 * - Integration: INTEGRATION_MANAGER
 * - Communication: CHAT_PROJECT (no organization chat)
 *
 * Scope: Content and team management within organization
 * Use Case: Project management, team coordination, content creation
 */
export const manager = ac.newRole({
  project: ["create", "read", "update", "delete"],
  recording: ["create", "read", "update", "delete"],
  task: ["create", "read", "update", "delete"],
  organization: ["read", "update"],
  user: ["read"],
  chat: ["project"],
  orgInstruction: ["read"],
  deepgram: [], // No deepgram access for manager
  setting: ["read", "update"],
  integration: ["manage"],
  team: ["read"],
  onboarding: ["create", "read", "update", "complete"],
  invitation: ["create", "cancel"],
});

/**
 * User Role
 *
 * Authorization Groups:
 * - Content: PROJECT_EDITOR, RECORDING_EDITOR, TASK_EDITOR (no delete)
 * - User: USER_VIEWER (self-view only)
 * - Organization: ORG_INSTRUCTION_READER, TEAM_VIEWER
 * - Communication: CHAT_PROJECT
 *
 * Scope: Content contribution within organization
 * Use Case: Create and edit content, participate in projects, collaborate with team
 */
export const user = ac.newRole({
  project: ["create", "read", "update"],
  recording: ["create", "read", "update"],
  task: ["create", "read", "update"],
  organization: [], // No organization management for regular users
  user: ["read"],
  chat: ["project"],
  admin: [], // No admin access
  orgInstruction: ["read"],
  deepgram: [], // No deepgram access
  setting: ["read", "update"],
  integration: [], // No integration management
  team: ["read"],
  onboarding: ["create", "read", "update", "complete"],
});

/**
 * Viewer Role
 *
 * Authorization Groups:
 * - Content: PROJECT_VIEWER, RECORDING_VIEWER, TASK_VIEWER (read-only)
 * - User: USER_VIEWER
 * - Organization: ORG_INSTRUCTION_READER, TEAM_VIEWER
 * - Communication: CHAT_PROJECT
 *
 * Scope: Read-only access within organization
 * Use Case: Review content, observe projects, read-only collaboration
 */
export const viewer = ac.newRole({
  project: ["read"],
  recording: ["read"],
  task: ["read"],
  organization: [], // No organization management
  user: ["read"],
  chat: ["project"],
  admin: [], // No admin access
  orgInstruction: ["read"],
  deepgram: [], // No deepgram access
  setting: ["read"],
  integration: [], // No integration management
  team: ["read"],
});

/**
 * Role mapping from Better Auth organization roles to application roles
 * Better Auth provides: owner, admin, member
 * We map them to our application roles
 */
export const roleMapping = {
  owner: admin, // Organization owners get admin privileges
  admin: admin, // Organization admins get admin privileges
  member: user, // Regular members get user privileges
} as const;

/**
 * Export roles object for Better Auth organization plugin
 */
export const roles = {
  superadmin: superAdmin,
  owner: admin,
  admin,
  manager,
  user,
  viewer,
} as const;

/**
 * Type exports for use throughout the application
 */
export type AccessControlStatement = typeof statement;
export type Resource = keyof AccessControlStatement;
export type Action<T extends Resource> = AccessControlStatement[T][number];
export type RoleName = keyof typeof roles;
export type BetterAuthRole = ReturnType<typeof ac.newRole>;

