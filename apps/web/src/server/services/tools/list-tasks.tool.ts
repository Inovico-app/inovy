import { tool } from "ai";
import { z } from "zod";
import { TasksQueries } from "@/server/data-access/tasks.queries";
import { logger } from "@/lib/logger";
import type { ToolContext } from "./tool-context";

export function createListTasksTool(ctx: ToolContext) {
  return tool({
    description:
      "List and search tasks. Use this to find tasks by title, filter by status or priority, or get an overview of tasks in a project or across the organization.",
    inputSchema: z.object({
      search: z.string().optional().describe("Search tasks by title or description"),
      status: z
        .enum(["pending", "in_progress", "completed", "cancelled"])
        .optional()
        .describe("Filter by task status"),
      priority: z
        .enum(["low", "medium", "high", "urgent"])
        .optional()
        .describe("Filter by task priority"),
      projectId: z.string().optional().describe("Filter by project ID"),
    }),
    execute: async ({ search, status, priority, projectId }) => {
      try {
        const effectiveProjectId = projectId ?? ctx.projectId;

        const allTasks = await TasksQueries.getTasksByOrganization(
          ctx.organizationId,
          {
            search,
            statuses: status ? [status] : undefined,
            priorities: priority ? [priority] : undefined,
            projectIds: effectiveProjectId
              ? [effectiveProjectId]
              : undefined,
          }
        );

        const results = allTasks.slice(0, 20).map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          status: t.status,
          priority: t.priority,
          assigneeName: t.assigneeName,
          dueDate: t.dueDate,
        }));

        return { tasks: results, total: allTasks.length };
      } catch (error) {
        logger.error("Error in list-tasks tool", {
          component: "ListTasksTool",
          error,
        });
        return { error: "Failed to fetch tasks. Please try again." };
      }
    },
  });
}
