import { logger } from "@/lib/logger";

/**
 * Action classifications for agent-initiated operations.
 * Used to determine if human approval is required before execution.
 */
export type ActionClassification = "read" | "write" | "destructive";

interface ActionDefinition {
  classification: ActionClassification;
  description: string;
  requiresApproval: boolean;
}

/**
 * Registry of all agent-callable actions and their classifications.
 *
 * Current tools are all read-only. When write/destructive tools are added
 * (e.g., createTask, deleteRecording, updateProject), register them here
 * with `requiresApproval: true` to gate execution behind human approval.
 *
 * @example
 * ```ts
 * // Future: register a write action
 * CriticalActionRegistry.register("createTask", {
 *   classification: "write",
 *   description: "Creates a new task in a project",
 *   requiresApproval: true,
 * });
 * ```
 */
export class CriticalActionRegistry {
  private static actions = new Map<string, ActionDefinition>();

  static {
    // Register all current read-only tools
    this.register("searchKnowledge", {
      classification: "read",
      description: "Semantic search over the knowledge base",
      requiresApproval: false,
    });
    this.register("listProjects", {
      classification: "read",
      description: "List projects in the organization",
      requiresApproval: false,
    });
    this.register("listRecordings", {
      classification: "read",
      description: "List recordings with optional search/filter",
      requiresApproval: false,
    });
    this.register("getRecordingDetails", {
      classification: "read",
      description: "Get detailed information about a recording",
      requiresApproval: false,
    });
    this.register("listTasks", {
      classification: "read",
      description: "List tasks with optional filters",
      requiresApproval: false,
    });
  }

  static register(actionName: string, definition: ActionDefinition): void {
    this.actions.set(actionName, definition);
  }

  static getClassification(actionName: string): ActionClassification {
    return this.actions.get(actionName)?.classification ?? "read";
  }

  static requiresApproval(actionName: string): boolean {
    const action = this.actions.get(actionName);
    if (!action) {
      // Unknown actions require approval by default (fail-closed)
      logger.warn("Unknown action checked for approval — defaulting to required", {
        component: "CriticalActionRegistry",
        actionName,
      });
      return true;
    }
    return action.requiresApproval;
  }

  static getDefinition(actionName: string): ActionDefinition | undefined {
    return this.actions.get(actionName);
  }

  static getAllActions(): Map<string, ActionDefinition> {
    return new Map(this.actions);
  }
}
