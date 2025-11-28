/**
 * Helper functions to convert old policy strings to Better Auth permission format
 * Use Better Auth permission format directly in new code: { project: ["create"] }
 */

import type { Permission } from "./rbac";

/**
 * Convert old policy string format to Better Auth permission format
 * Example: "projects:create" -> { project: ["create"] }
 */
export function policyToPermissions(policy: string): Permission {
  const [resource, action] = policy.split(":");

  if (!resource || !action) {
    throw new Error(`Invalid policy format: ${policy}`);
  }

  // Map policy resources to Better Auth access control resources
  const resourceMap: Record<string, string> = {
    projects: "project",
    recordings: "recording",
    tasks: "task",
    organizations: "organization",
    users: "user",
    chat: "chat",
    admin: "admin",
    "org:instructions": "orgInstruction",
    deepgram: "deepgram",
    settings: "setting",
    integrations: "integration",
    teams: "team",
  };

  const mappedResource = resourceMap[resource] ?? resource;

  // Map policy actions to Better Auth access control actions
  const actionMap: Record<string, string> = {
    create: "create",
    read: "read",
    update: "update",
    delete: "delete",
    project: "project",
    organization: "organization",
    all: "all",
    write: "write",
    token: "token",
    manage: "manage",
  };

  const mappedAction = actionMap[action] ?? action;

  return {
    [mappedResource]: [mappedAction],
  };
}

