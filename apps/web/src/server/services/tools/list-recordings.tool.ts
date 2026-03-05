import { tool } from "ai";
import { z } from "zod";
import { RecordingsQueries } from "@/server/data-access/recordings.queries";
import { logger } from "@/lib/logger";
import type { ToolContext } from "./tool-context";

export function createListRecordingsTool(ctx: ToolContext) {
  return tool({
    description:
      "List and search recordings. Use this to find recordings by title, see recent recordings, or get an overview of recordings in a project or across the organization.",
    inputSchema: z.object({
      search: z.string().optional().describe("Search recordings by title"),
      projectId: z.string().optional().describe("Filter by project ID"),
    }),
    execute: async ({ search, projectId }) => {
      try {
        const effectiveProjectId = projectId ?? ctx.projectId;

        if (effectiveProjectId) {
          const recs = await RecordingsQueries.selectRecordingsByProjectId(
            effectiveProjectId,
            ctx.organizationId,
            { search, statusFilter: "active" }
          );
          const results = recs.slice(0, 20).map((r) => ({
            id: r.id,
            title: r.title,
            projectName: null as string | null,
            status: r.transcriptionStatus,
            recordingDate: r.recordingDate,
            duration: r.duration,
          }));

          return { recordings: results, total: recs.length };
        }

        const recs = await RecordingsQueries.selectRecordingsByOrganization(
          ctx.organizationId,
          { search, statusFilter: "active" }
        );
        const results = recs.slice(0, 20).map((r) => ({
          id: r.id,
          title: r.title,
          projectName: r.projectName,
          status: r.transcriptionStatus,
          recordingDate: r.recordingDate,
          duration: r.duration,
        }));

        return { recordings: results, total: recs.length };
      } catch (error) {
        logger.error("Error in list-recordings tool", {
          component: "ListRecordingsTool",
          error,
        });
        return { error: "Failed to fetch recordings. Please try again." };
      }
    },
  });
}
