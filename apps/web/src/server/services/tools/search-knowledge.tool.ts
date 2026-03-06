import { tool } from "ai";
import { z } from "zod";
import { logger } from "@/lib/logger";
import type { ToolContext } from "./tool-context";
import { RAGSearchTool } from "./rag-search.tool";

const ragSearchTool = new RAGSearchTool();

export function createSearchKnowledgeTool(ctx: ToolContext) {

  return tool({
    description:
      "Search the knowledge base for relevant information using semantic search. " +
      "Searches across recordings, transcriptions, summaries, tasks, project templates, " +
      "and organization instructions. Use this when you need to find specific information " +
      "from past meetings, documents, or organizational knowledge.",
    inputSchema: z.object({
      query: z.string().min(1).describe("Search query text"),
      limit: z
        .number()
        .int()
        .positive()
        .max(20)
        .optional()
        .default(5)
        .describe("Maximum number of results to return (1-20)"),
      useHybrid: z
        .boolean()
        .optional()
        .default(true)
        .describe("Use hybrid search combining vector and keyword matching"),
      useReranking: z
        .boolean()
        .optional()
        .default(true)
        .describe("Use cross-encoder re-ranking for improved relevance"),
    }),
    execute: async ({ query, limit, useHybrid, useReranking }) => {
      try {
        const result = await ragSearchTool.execute({
          query,
          limit,
          useHybrid,
          useReranking,
          organizationId: ctx.organizationId,
          projectId: ctx.projectId,
        });

        if (result.isErr()) {
          logger.error("Knowledge base search failed", {
            component: "SearchKnowledgeTool",
            error: result.error,
          });
          return { error: "Failed to search knowledge base. Please try again." };
        }

        const { results, count, message } = result.value;

        return {
          results: results.map((r) => ({
            content: r.content,
            score: Math.round(r.score * 100) / 100,
            sourceType: r.metadata.type,
            title: r.metadata.title ?? null,
            source: r.metadata.source ?? null,
            recordingId: (r.metadata.recordingId as string) ?? null,
            recordingDate: r.metadata.recordingDate ?? null,
          })),
          total: count,
          message,
        };
      } catch (error) {
        logger.error("Unexpected error in search-knowledge tool", {
          component: "SearchKnowledgeTool",
          error,
        });
        return { error: "Failed to search knowledge base. Please try again." };
      }
    },
  });
}
