/**
 * RAG Search Tool
 *
 * Custom tool (not via MCP) that provides semantic search capabilities
 * over the knowledge base using Qdrant vector database.
 *
 * This tool is designed for AI agent consumption and provides:
 * - Hybrid search (vector + keyword)
 * - Reciprocal Rank Fusion for result merging
 * - Optional re-ranking with cross-encoder
 * - Project-level and organization-level filtering
 * - LLM-optimized result formatting
 */

import { ActionErrors, type ActionResult } from "@/lib/action-errors";
import { logger } from "@/lib/logger";
import { err, ok } from "neverthrow";
import { z } from "zod";
import { RAGService } from "../rag/rag.service";
import type { SearchResult } from "../rag/types";

/**
 * Input schema for RAG search tool
 */
export const ragSearchInputSchema = z.object({
  query: z.string().min(1, "Query is required").describe("Search query text"),
  limit: z
    .number()
    .int()
    .positive()
    .max(50)
    .optional()
    .default(5)
    .describe("Maximum number of results to return (1-50)"),
  useHybrid: z
    .boolean()
    .default(true)
    .describe("Use hybrid search (vector + keyword)"),
  useReranking: z
    .boolean()
    .default(true)
    .describe("Use cross-encoder re-ranking for improved relevance"),
  userId: z.string().optional().describe("User ID for filtering results"),
  organizationId: z
    .string()
    .optional()
    .describe("Organization ID for filtering results"),
  projectId: z.uuid().optional().describe("Project ID for filtering"),
  filters: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("Additional metadata filters"),
});

export type RAGSearchInput = z.infer<typeof ragSearchInputSchema>;

/**
 * Formatted search result for LLM consumption
 */
export interface FormattedSearchResult {
  content: string;
  score: number;
  metadata: {
    type: string;
    title?: string;
    source?: string;
    recordingId?: string;
    recordingTitle?: string;
    recordingDate?: string;
    timestamp?: number;
    [key: string]: unknown;
  };
}

/**
 * RAG search tool response
 */
export interface RAGSearchResponse {
  results: FormattedSearchResult[];
  count: number;
  query: string;
  useHybrid: boolean;
  useReranking: boolean;
  message?: string;
}

/**
 * RAG Search Tool for AI agents
 *
 * Provides semantic search over recordings, summaries, tasks,
 * project templates, and organization instructions.
 */
export class RAGSearchTool {
  private ragService: RAGService;

  constructor() {
    this.ragService = new RAGService();
  }

  /**
   * Execute RAG search
   *
   * @param input - Search parameters
   * @returns Formatted search results for LLM consumption
   */
  async execute(
    input: RAGSearchInput
  ): Promise<ActionResult<RAGSearchResponse>> {
    try {
      logger.info("RAG search tool execution started", {
        component: "RAGSearchTool",
        query: input.query,
        limit: input.limit,
        useHybrid: input.useHybrid,
        useReranking: input.useReranking,
        organizationId: input.organizationId,
        projectId: input.projectId,
      });

      // Validate input
      const validationResult = ragSearchInputSchema.safeParse(input);
      if (!validationResult.success) {
        const errors = validationResult.error.issues;
        logger.error("Invalid RAG search input", {
          component: "RAGSearchTool",
          errors,
        });
        return err(
          ActionErrors.badRequest(
            `Invalid search parameters: ${errors
              .map((e: { message: string }) => e.message)
              .join(", ")}`,
            "RAGSearchTool.execute"
          )
        );
      }

      const validatedInput = validationResult.data;

      // Require either userId or organizationId for proper filtering
      if (!validatedInput.userId && !validatedInput.organizationId) {
        return err(
          ActionErrors.badRequest(
            "Either userId or organizationId is required for search",
            "RAGSearchTool.execute"
          )
        );
      }

      // Execute search via RAGService
      const searchResult = await this.ragService.search(
        validatedInput.query,
        validatedInput.userId ?? "",
        {
          limit: validatedInput.limit,
          useHybrid: validatedInput.useHybrid,
          useReranking: validatedInput.useReranking,
          filters: validatedInput.filters ?? {},
          organizationId: validatedInput.organizationId,
          projectId: validatedInput.projectId,
        }
      );

      if (searchResult.isErr()) {
        logger.error("RAG search failed", {
          component: "RAGSearchTool",
          error: searchResult.error,
        });
        return err(searchResult.error);
      }

      const results = searchResult.value;

      // Format results for LLM consumption
      const formattedResults = this.formatResultsForLLM(results);

      const response: RAGSearchResponse = {
        results: formattedResults,
        count: formattedResults.length,
        query: validatedInput.query,
        useHybrid: validatedInput.useHybrid,
        useReranking: validatedInput.useReranking,
        message:
          formattedResults.length === 0
            ? "No relevant information found in the knowledge base."
            : `Found ${formattedResults.length} relevant result${
                formattedResults.length === 1 ? "" : "s"
              }.`,
      };

      logger.info("RAG search tool execution completed", {
        component: "RAGSearchTool",
        resultsCount: response.count,
        query: validatedInput.query,
      });

      return ok(response);
    } catch (error) {
      logger.error("Unexpected error in RAG search tool", {
        component: "RAGSearchTool",
        error: error instanceof Error ? error.message : String(error),
      });
      return err(
        ActionErrors.internal(
          "An unexpected error occurred during search",
          error as Error,
          "RAGSearchTool.execute"
        )
      );
    }
  }

  /**
   * Format search results for optimal LLM consumption
   *
   * Converts internal SearchResult format to a clean, structured format
   * that's easy for LLMs to parse and understand.
   */
  private formatResultsForLLM(
    results: SearchResult[]
  ): FormattedSearchResult[] {
    return results.map((result) => {
      // Determine the best score to use (reranked if available, otherwise similarity)
      const score = result.rerankedScore ?? result.similarity;

      // Extract key metadata fields
      const metadata: FormattedSearchResult["metadata"] = {
        type: result.contentType,
        title:
          result.metadata.title ??
          result.metadata.recordingTitle ??
          result.metadata.documentTitle,
        source: this.getSourceDescription(result),
        recordingId: result.metadata.recordingId as string | undefined,
        recordingTitle: result.metadata.recordingTitle as string | undefined,
        recordingDate: result.metadata.recordingDate as string | undefined,
        timestamp: result.metadata.timestamp as number | undefined,
      };

      // Add content type specific metadata
      if (result.contentType === "task") {
        metadata.priority = result.metadata.priority as string | undefined;
        metadata.status = result.metadata.status as string | undefined;
      }

      // Include chunk information if available
      if (result.metadata.chunkIndex !== undefined) {
        metadata.chunkIndex = result.metadata.chunkIndex as number;
        metadata.totalChunks = result.metadata.totalChunks as number;
      }

      return {
        content: result.contentText,
        score,
        metadata,
      };
    });
  }

  /**
   * Generate a human-readable source description
   */
  private getSourceDescription(result: SearchResult): string {
    switch (result.contentType) {
      case "transcription":
        return `Transcription from "${
          result.metadata.recordingTitle ?? "recording"
        }"`;
      case "summary":
        return `Summary of "${result.metadata.recordingTitle ?? "recording"}"`;
      case "task":
        return `Task from "${result.metadata.recordingTitle ?? "recording"}"`;
      case "project_template":
        return "Project template";
      case "organization_instructions":
        return "Organization instructions";
      case "knowledge_document":
        return `Knowledge document: "${
          result.metadata.documentTitle ?? "Unknown"
        }"`;
      default:
        return result.contentType;
    }
  }

  /**
   * Get tool metadata for registration
   *
   * This provides the tool definition that can be used by AI agents
   * or tool registries to understand the tool's capabilities.
   */
  static getToolMetadata() {
    return {
      name: "search_knowledge_base",
      description:
        "Search the knowledge base for relevant information using semantic search. " +
        "Searches across recordings, transcriptions, summaries, tasks, project templates, " +
        "and organization instructions. Supports hybrid search (vector + keyword) and " +
        "re-ranking for improved relevance. Use this tool when you need to find specific " +
        "information from past meetings, documents, or organizational knowledge.",
      category: "knowledge_base",
      inputSchema: ragSearchInputSchema,
      requiresAuth: true,
      examples: [
        {
          description: "Search for information about a specific topic",
          input: {
            query: "What was discussed about the Q4 marketing strategy?",
            limit: 5,
            useHybrid: true,
            organizationId: "org-123",
            projectId: "project-456",
          },
        },
        {
          description: "Find tasks related to a specific keyword",
          input: {
            query: "deployment tasks",
            limit: 10,
            filters: { contentType: "task" },
            organizationId: "org-123",
          },
        },
      ],
    };
  }
}

