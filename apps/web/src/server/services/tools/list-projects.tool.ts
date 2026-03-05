import { tool } from "ai";
import { z } from "zod";
import { ProjectQueries } from "@/server/data-access/projects.queries";
import { logger } from "@/lib/logger";
import type { ToolContext } from "./tool-context";

export function createListProjectsTool(ctx: ToolContext) {
  return tool({
    description:
      "List projects in the organization. Use this to find projects, see their status, or get an overview of what projects exist.",
    inputSchema: z.object({
      status: z
        .enum(["active", "archived", "completed"])
        .optional()
        .describe("Filter projects by status"),
    }),
    execute: async ({ status }) => {
      try {
        const projects =
          await ProjectQueries.findByOrganizationWithRecordingCount({
            organizationId: ctx.organizationId,
            status,
          });

        const results = projects.slice(0, 20).map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          status: p.status,
          recordingCount: p.recordingCount,
          createdAt: p.createdAt,
        }));

        return { projects: results, total: projects.length };
      } catch (error) {
        logger.error("Error in list-projects tool", {
          component: "ListProjectsTool",
          error,
        });
        return { error: "Failed to fetch projects. Please try again." };
      }
    },
  });
}
