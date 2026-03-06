import { tool } from "ai";
import { z } from "zod";
import { RecordingsQueries } from "@/server/data-access/recordings.queries";
import { AIInsightsQueries } from "@/server/data-access/ai-insights.queries";
import { logger } from "@/lib/logger";
import type { ToolContext } from "./tool-context";

export function createGetRecordingDetailsTool(ctx: ToolContext) {
  return tool({
    description:
      "Get detailed information about a specific recording, including its summary, tasks, and metadata. " +
      "Use this when you know a recording ID (e.g., from listRecordings) and need its summary, action items, " +
      "or other details. This is the BEST tool for answering questions like 'what was discussed in recording X' " +
      "or 'give me the summary of the latest recording'.",
    inputSchema: z.object({
      recordingId: z
        .string()
        .uuid()
        .describe("The recording ID to get details for"),
    }),
    execute: async ({ recordingId }) => {
      try {
        const recording =
          await RecordingsQueries.selectRecordingById(recordingId);

        if (!recording) {
          return { error: "Recording not found." };
        }

        // Verify organization access
        if (recording.organizationId !== ctx.organizationId) {
          return { error: "Recording not found." };
        }

        // If in project context, verify project access
        if (ctx.projectId && recording.projectId !== ctx.projectId) {
          return { error: "Recording not found in this project." };
        }

        // Fetch all insights for this recording
        const insights =
          await AIInsightsQueries.getInsightsByRecordingId(recordingId);

        const summaryInsight = insights.find(
          (i) => i.insightType === "summary" && i.processingStatus === "completed"
        );

        const taskInsights = insights.filter(
          (i) =>
            i.insightType === "action_items" &&
            i.processingStatus === "completed"
        );

        // Format summary content
        let summaryContent: string | null = null;
        if (summaryInsight?.content) {
          const content = summaryInsight.content as Record<string, unknown>;
          if (typeof content.overview === "string") {
            summaryContent = content.overview;
          } else {
            summaryContent = JSON.stringify(content);
          }
        }

        // Format tasks
        let tasks: Array<{ title: string; priority?: string; status?: string }> =
          [];
        for (const taskInsight of taskInsights) {
          const content = taskInsight.content as Record<string, unknown>;
          if (Array.isArray(content.tasks)) {
            tasks = content.tasks.map(
              (t: Record<string, unknown>) => ({
                title: String(t.title ?? ""),
                priority: t.priority ? String(t.priority) : undefined,
                status: t.status ? String(t.status) : undefined,
              })
            );
          }
        }

        return {
          recording: {
            id: recording.id,
            title: recording.title,
            description: recording.description,
            recordingDate: recording.recordingDate,
            duration: recording.duration,
            status: recording.transcriptionStatus,
          },
          summary: summaryContent,
          topics: summaryInsight?.content
            ? ((summaryInsight.content as Record<string, unknown>)
                .topics as string[]) ?? []
            : [],
          decisions: summaryInsight?.content
            ? ((summaryInsight.content as Record<string, unknown>)
                .decisions as string[]) ?? []
            : [],
          tasks,
          speakerCount: summaryInsight?.speakersDetected ?? null,
        };
      } catch (error) {
        logger.error("Error in get-recording-details tool", {
          component: "GetRecordingDetailsTool",
          error,
        });
        return { error: "Failed to fetch recording details. Please try again." };
      }
    },
  });
}
