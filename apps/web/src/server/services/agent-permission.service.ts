import { logger } from "@/lib/logger";

/**
 * Agent tool names that can be controlled via role-based permissions.
 * Must stay in sync with the keys returned by createChatTools().
 */
const TOOL_NAMES = [
  "getRecordingDetails",
  "listProjects",
  "listRecordings",
  "listTasks",
  "searchKnowledge",
] as const;

export type AgentToolName = (typeof TOOL_NAMES)[number];

/**
 * Role-based tool allowlists.
 *
 * - superadmin / admin / manager: full tool access
 * - user: all read tools (standard project member)
 * - viewer: knowledge search and recording details only
 *
 * Any role not listed here gets zero tools (fail-closed).
 */
const TOOL_ALLOWLIST: Record<string, readonly AgentToolName[]> = {
  superadmin: TOOL_NAMES,
  admin: TOOL_NAMES,
  owner: TOOL_NAMES,
  manager: TOOL_NAMES,
  user: [
    "searchKnowledge",
    "listProjects",
    "listRecordings",
    "getRecordingDetails",
    "listTasks",
  ],
  viewer: ["searchKnowledge", "getRecordingDetails"],
} as const;

export class AgentPermissionService {
  /**
   * Return the set of tool names a given role is allowed to use.
   * Unknown roles get an empty set (fail-closed).
   */
  static getAllowedTools(role: string): ReadonlySet<AgentToolName> {
    const allowed = TOOL_ALLOWLIST[role];

    if (!allowed) {
      logger.security.unauthorizedAccess({
        userId: "system",
        resource: "agent-tools",
        action: "resolve-permissions",
        reason: `Unknown role "${role}" — denying all tools`,
      });
      return new Set();
    }

    return new Set(allowed);
  }

  /**
   * Filter a tools record so it only contains the tools the role may use.
   * Returns a new object; the original is not mutated.
   */
  static filterToolsByRole<T extends Record<string, unknown>>(
    tools: T,
    role: string,
    context?: { userId?: string; organizationId?: string }
  ): Partial<T> {
    const allowed = this.getAllowedTools(role);
    const filtered: Record<string, unknown> = {};
    const denied: string[] = [];

    for (const [name, tool] of Object.entries(tools)) {
      if (allowed.has(name as AgentToolName)) {
        filtered[name] = tool;
      } else {
        denied.push(name);
      }
    }

    if (denied.length > 0) {
      logger.info("Agent tools filtered by role", {
        component: "AgentPermissionService",
        role,
        allowed: Object.keys(filtered),
        denied,
        ...context,
      });
    }

    return filtered as Partial<T>;
  }

  /**
   * Check whether a specific tool is allowed for a role.
   */
  static isToolAllowed(toolName: string, role: string): boolean {
    return this.getAllowedTools(role).has(toolName as AgentToolName);
  }
}
