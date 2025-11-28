/**
 * Type-safe permission types and presets
 * Shared between server and client
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
 */
export const Permissions = {
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

  // Organization permissions
  organization: {
    create: { organization: ["create"] } as Permissions,
    read: { organization: ["read"] } as Permissions,
    update: { organization: ["update"] } as Permissions,
    delete: { organization: ["delete"] } as Permissions,
  },

  // User permissions
  user: {
    read: { user: ["read"] } as Permissions,
    update: { user: ["update"] } as Permissions,
    delete: { user: ["delete"] } as Permissions,
  },

  // Chat permissions
  chat: {
    project: { chat: ["project"] } as Permissions,
    organization: { chat: ["organization"] } as Permissions,
  },

  // Admin permissions
  admin: {
    all: { admin: ["all"] } as Permissions,
  },

  // Organization instruction permissions
  orgInstruction: {
    read: { orgInstruction: ["read"] } as Permissions,
    write: { orgInstruction: ["write"] } as Permissions,
  },

  // Deepgram permissions
  deepgram: {
    token: { deepgram: ["token"] } as Permissions,
  },

  // Settings permissions
  setting: {
    read: { setting: ["read"] } as Permissions,
    update: { setting: ["update"] } as Permissions,
  },

  // Integration permissions
  integration: {
    manage: { integration: ["manage"] } as Permissions,
  },

  // Team permissions
  team: {
    create: { team: ["create"] } as Permissions,
    read: { team: ["read"] } as Permissions,
    update: { team: ["update"] } as Permissions,
    delete: { team: ["delete"] } as Permissions,
  },
} as const;

