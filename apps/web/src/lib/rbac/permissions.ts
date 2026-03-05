/**
 * Type-safe permission types and presets
 * Shared between server and client
 *
 * These permission presets are organized according to authorization groups
 * defined in authorization-groups.ts for SSD-7.1.01 compliance.
 *
 * @see authorization-groups.ts for the complete authorization group structure
 * @see AUTHORIZATION_GROUPS.md for detailed documentation
 */

import type { Action, Resource } from "../auth/access-control";

/**
 * Type-safe permission object
 * Only allows valid resource-action combinations from access-control.ts
 */
export type Permission<T extends Resource = Resource> = {
  [K in T]?: Action<K>[];
};

/**
 * Helper type to create a permission object with type checking
 */
export type Permissions = {
  [K in Resource]?: Action<K>[];
};

/**
 * Common permission presets for convenience
 * These are type-safe and match the access control configuration
 *
 * Permission presets are used in server actions to declare required permissions.
 * They map to authorization groups which provide the organizational structure
 * required by SSD-7.1.01.
 */
export const Permissions = {
  /**
   * System Administration Permissions
   * Part of: System Administration authorization groups
   */

  // Superadmin (system-wide access)
  superadmin: {
    all: { superadmin: ["all"] } as Permissions,
  },

  // Admin (organization-scoped access)
  admin: {
    all: { admin: ["all"] } as Permissions,
  },

  /**
   * Content Management Permissions
   * Part of: Content Management authorization groups
   */

  // Project permissions
  project: {
    create: { project: ["create"] } as Permissions,
    read: { project: ["read"] } as Permissions,
    update: { project: ["update"] } as Permissions,
    delete: { project: ["delete"] } as Permissions,
  },

  // Recording permissions
  recording: {
    create: { recording: ["create"] } as Permissions,
    read: { recording: ["read"] } as Permissions,
    update: { recording: ["update"] } as Permissions,
    delete: { recording: ["delete"] } as Permissions,
  },

  // Task permissions
  task: {
    create: { task: ["create"] } as Permissions,
    read: { task: ["read"] } as Permissions,
    update: { task: ["update"] } as Permissions,
    delete: { task: ["delete"] } as Permissions,
  },

  /**
   * Organization Administration Permissions
   * Part of: Organization Administration authorization groups
   */

  // Organization permissions
  organization: {
    create: { organization: ["create"] } as Permissions,
    list: { organization: ["list"] } as Permissions,
    read: { organization: ["read"] } as Permissions,
    update: { organization: ["update"] } as Permissions,
    delete: { organization: ["delete"] } as Permissions,
  },

  // Team permissions
  team: {
    create: { team: ["create"] } as Permissions,
    read: { team: ["read"] } as Permissions,
    update: { team: ["update"] } as Permissions,
    delete: { team: ["delete"] } as Permissions,
  },

  // Settings permissions
  setting: {
    read: { setting: ["read"] } as Permissions,
    update: { setting: ["update"] } as Permissions,
  },

  // Organization instruction permissions
  orgInstruction: {
    read: { orgInstruction: ["read"] } as Permissions,
    write: { orgInstruction: ["write"] } as Permissions,
  },

  /**
   * User Management Permissions
   * Part of: User Management authorization groups
   */

  // User permissions
  user: {
    read: { user: ["read"] } as Permissions,
    update: { user: ["update"] } as Permissions,
    delete: { user: ["delete"] } as Permissions,
  },

  /**
   * Communication Permissions
   * Part of: Communication authorization groups
   */

  // Chat permissions
  chat: {
    project: { chat: ["project"] } as Permissions,
    organization: { chat: ["organization"] } as Permissions,
  },

  /**
   * Integration Management Permissions
   * Part of: Integration Management authorization groups
   */

  // Deepgram permissions (restricted to superadmin)
  deepgram: {
    token: { deepgram: ["token"] } as Permissions,
  },

  // Integration permissions
  integration: {
    manage: { integration: ["manage"] } as Permissions,
  },

  /**
   * Audit & Compliance Permissions
   * Part of: Audit authorization groups
   */

  // Audit log permissions
  "audit-log": {
    read: { "audit-log": ["read"] } as Permissions,
  },
} as const;

