/**
 * Better Auth Access Control Configuration
 * Defines resources, actions, and roles for RBAC using Better Auth's access control plugin
 */

import { createAccessControl } from "better-auth/plugins/access";

/**
 * Access control statements defining all resources and their available actions
 * Maps to our application's policies
 */
const statement = {
  // Project management
  project: ["create", "read", "update", "delete"],

  // Recording management
  recording: ["create", "read", "update", "delete"],

  // Task management
  task: ["create", "read", "update", "delete"],

  // Organization management
  organization: ["create", "list", "read", "update", "delete"],

  // User management
  user: ["create", "read", "update", "delete"],

  // Chat management
  chat: ["project", "organization"],

  // Superadmin actions
  superadmin: ["all"],

  // Admin actions
  admin: ["all"],

  // Organization instructions
  orgInstruction: ["read", "write"],

  // Deepgram management
  deepgram: ["token"],

  // Settings management
  setting: ["read", "update"],

  // Integrations management
  integration: ["manage"],

  // Team management
  team: ["create", "read", "update", "delete"],

  "audit-log": ["read"],
} as const;

/**
 * Create access control instance
 */
export const ac = createAccessControl(statement);

/**
 * Define roles with their permissions
 * Maps Better Auth organization roles (owner, admin, member) to application permissions
 */

// Super Admin - Full access to everything
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
});

// Admin - Full access except super admin features
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
});

// Manager - Limited admin access
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
});

// User - Standard user permissions
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
});

// Viewer - Read-only access
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

