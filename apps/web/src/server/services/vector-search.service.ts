import { ActionErrors, type ActionResult } from "@/lib/action-errors";
import { logger } from "@/lib/logger";
import { EmbeddingsQueries } from "@/server/data-access/embeddings.queries";
import { err, ok } from "neverthrow";
import { EmbeddingService } from "./embedding.service";
import { KnowledgeBaseService } from "./knowledge-base.service";
import { KnowledgeBaseDocumentsQueries } from "@/server/data-access";

export interface SearchResult {
  id: string;
  contentType: "recording" | "transcription" | "summary" | "task" | "knowledge_document";
  contentId: string;
  contentText: string;
  similarity: number;
  metadata: {
    title?: string;
    recordingTitle?: string;
    recordingDate?: string;
    recordingId?: string;
    priority?: string;
    status?: string;
    timestamp?: number;
    chunkIndex?: number;
    documentId?: string; // For knowledge documents
    documentTitle?: string; // For knowledge documents
    [key: string]: unknown;
  };
}

export class VectorSearchService {
  /**
   * Search for relevant content in a project using vector similarity
   */
  static async search(
    query: string,
    projectId: string,
    options: {
      matchThreshold?: number;
      matchCount?: number;
    } = {}
  ): Promise<ActionResult<SearchResult[]>> {
    try {
      logger.info("Performing vector search", { query, projectId, options });

      // Generate embedding for the query
      const queryEmbeddingResult = await EmbeddingService.generateEmbedding(
        query
      );

      if (queryEmbeddingResult.isErr()) {
        return err(queryEmbeddingResult.error);
      }

      const queryEmbedding = queryEmbeddingResult.value;

      // Search for similar embeddings (includes knowledge documents if indexed)
      const results = await EmbeddingsQueries.searchSimilar(
        queryEmbedding,
        projectId,
        {
          matchThreshold: options.matchThreshold || 0.5,
          matchCount: options.matchCount || 10,
        }
      );

      // Transform results (knowledge documents will be included if embeddings exist)
      const searchResults: SearchResult[] = results.map((result) => ({
        id: result.id,
        contentType: result.contentType as SearchResult["contentType"],
        contentId: result.contentId,
        contentText: result.contentText,
        similarity: result.similarity,
        metadata: (result.metadata as SearchResult["metadata"]) || {},
      }));

      logger.info("Vector search completed", {
        query,
        projectId,
        resultsCount: searchResults.length,
      });

      return ok(searchResults);
    } catch (error) {
      logger.error("Error performing vector search", {
        error,
        query,
        projectId,
      });
      return err(
        ActionErrors.internal(
          "Error performing vector search",
          error as Error,
          "VectorSearchService.search"
        )
      );
    }
  }

  /**
   * Build context string from search results for LLM
   */
  static buildContextFromResults(results: SearchResult[]): string {
    if (results.length === 0) {
      return "No relevant information found in the project.";
    }

    const contextParts: string[] = [];

    // Group results by recording
    const recordingGroups = new Map<string, SearchResult[]>();

    for (const result of results) {
      const recordingId = result.metadata.recordingId || result.contentId;
      if (!recordingGroups.has(recordingId)) {
        recordingGroups.set(recordingId, []);
      }
      recordingGroups.get(recordingId)?.push(result);
    }

    // Build context for each recording
    for (const [recordingId, recordingResults] of recordingGroups.entries()) {
      const recordingTitle =
        recordingResults[0]?.metadata.recordingTitle || "Unknown Recording";
      const recordingDate =
        recordingResults[0]?.metadata.recordingDate || "Unknown Date";

      contextParts.push(`\n## Recording: ${recordingTitle}`);
      contextParts.push(`Date: ${recordingDate}`);
      contextParts.push(`Recording ID: ${recordingId}`);

      // Add transcription chunks
      const transcriptions = recordingResults.filter(
        (r) => r.contentType === "transcription"
      );
      if (transcriptions.length > 0) {
        contextParts.push("\n### Transcription:");
        transcriptions.forEach((t) => {
          contextParts.push(t.contentText);
        });
      }

      // Add summary
      const summaries = recordingResults.filter(
        (r) => r.contentType === "summary"
      );
      if (summaries.length > 0) {
        contextParts.push("\n### Summary:");
        summaries.forEach((s) => {
          contextParts.push(s.contentText);
        });
      }

      // Add tasks
      const tasks = recordingResults.filter((r) => r.contentType === "task");
      if (tasks.length > 0) {
        contextParts.push("\n### Related Tasks:");
        tasks.forEach((task) => {
          contextParts.push(`- ${task.contentText}`);
        });
      }

      contextParts.push("---");
    }

    // Add knowledge documents separately (if any)
    const knowledgeDocs = results.filter(
      (r) => r.contentType === "knowledge_document"
    );
    if (knowledgeDocs.length > 0) {
      contextParts.push("\n## Knowledge Base Documents:");
      knowledgeDocs.forEach((doc) => {
        const docTitle = doc.metadata.documentTitle as string || doc.metadata.title as string || "Knowledge Document";
        contextParts.push(`\n### ${docTitle}`);
        contextParts.push(doc.contentText);
      });
    }

    return contextParts.join("\n");
  }

  /**
   * Format search results as source citations
   */
  static formatSourceCitations(results: SearchResult[]): Array<{
    contentId: string;
    contentType: "recording" | "transcription" | "summary" | "task" | "knowledge_document";
    title: string;
    excerpt: string;
    similarityScore: number;
    recordingId?: string;
    timestamp?: number;
    recordingDate?: string;
    projectName?: string;
    projectId?: string;
    documentId?: string; // For knowledge documents
    documentTitle?: string; // For knowledge documents
  }> {
    return results.map((result) => {
      // Handle knowledge documents differently
      if (result.contentType === "knowledge_document") {
        return {
          contentId: result.contentId,
          contentType: result.contentType,
          title: result.metadata.documentTitle as string || result.metadata.title as string || "Knowledge Document",
          excerpt:
            result.contentText.length > 200
              ? result.contentText.substring(0, 200) + "..."
              : result.contentText,
          similarityScore: result.similarity,
          documentId: result.metadata.documentId as string,
          documentTitle: result.metadata.documentTitle as string,
        };
      }

      // Handle regular recording sources
      return {
        contentId: result.contentId,
        contentType: result.contentType,
        title:
          result.metadata.title || result.metadata.recordingTitle || "Untitled",
        excerpt:
          result.contentText.length > 200
            ? result.contentText.substring(0, 200) + "..."
            : result.contentText,
        similarityScore: result.similarity,
        // For transcriptions, the contentId IS the recordingId
        recordingId:
          result.metadata.recordingId ??
          (result.contentType === "transcription" ? result.contentId : undefined),
        timestamp: result.metadata.timestamp,
        recordingDate: result.metadata.recordingDate as string | undefined,
        projectName: result.metadata.projectName as string | undefined,
        projectId: result.metadata.projectId as string | undefined,
      };
    });
  }

  /**
   * Get relevant context for a user query
   */
  static async getRelevantContext(
    query: string,
    projectId: string
  ): Promise<
    ActionResult<{
      context: string;
      sources: Array<{
        contentId: string;
        contentType: "recording" | "transcription" | "summary" | "task";
        title: string;
        excerpt: string;
        similarityScore: number;
        recordingId?: string;
        timestamp?: number;
        recordingDate?: string;
        projectName?: string;
        projectId?: string;
      }>;
    }>
  > {
    try {
      const searchResult = await this.search(query, projectId, {
        matchThreshold: 0.6, // Higher threshold for better relevance
        matchCount: 8, // Get top 8 results
      });

      if (searchResult.isErr()) {
        return err(searchResult.error);
      }

      const results = searchResult.value;

      const context = this.buildContextFromResults(results);
      const sources = this.formatSourceCitations(results);

      return ok({ context, sources });
    } catch (error) {
      logger.error("Error getting relevant context", {
        error,
        query,
        projectId,
      });
      return err(
        ActionErrors.internal(
          "Error getting relevant context",
          error as Error,
          "VectorSearchService.getRelevantContext"
        )
      );
    }
  }

  /**
   * Search for relevant content across all projects in an organization
   */
  static async searchOrganizationWide(
    query: string,
    organizationId: string,
    options: {
      matchThreshold?: number;
      matchCount?: number;
    } = {}
  ): Promise<ActionResult<SearchResult[]>> {
    try {
      logger.info("Performing organization-wide vector search", {
        query,
        organizationId,
        options,
      });

      // Generate embedding for the query
      const queryEmbeddingResult = await EmbeddingService.generateEmbedding(
        query
      );

      if (queryEmbeddingResult.isErr()) {
        return err(queryEmbeddingResult.error);
      }

      const queryEmbedding = queryEmbeddingResult.value;

      // Search for similar embeddings across organization
      const results = await EmbeddingsQueries.searchSimilarOrganizationWide(
        queryEmbedding,
        organizationId,
        {
          matchThreshold: options.matchThreshold || 0.5,
          matchCount: options.matchCount || 15,
        }
      );

      // Transform results
      const searchResults: SearchResult[] = results.map((result) => ({
        id: result.id,
        contentType: result.contentType as SearchResult["contentType"],
        contentId: result.contentId,
        contentText: result.contentText,
        similarity: result.similarity,
        metadata: (result.metadata as SearchResult["metadata"]) || {},
      }));

      logger.info("Organization-wide vector search completed", {
        query,
        organizationId,
        resultsCount: searchResults.length,
      });

      return ok(searchResults);
    } catch (error) {
      logger.error("Error performing organization-wide vector search", {
        error,
        query,
        organizationId,
      });
      return err(
        ActionErrors.internal(
          "Error performing organization-wide vector search",
          error as Error,
          "VectorSearchService.searchOrganizationWide"
        )
      );
    }
  }

  /**
   * Get relevant context for a user query across organization
   */
  static async getRelevantContextOrganizationWide(
    query: string,
    organizationId: string
  ): Promise<
    ActionResult<{
      context: string;
      sources: Array<{
        contentId: string;
        contentType: "recording" | "transcription" | "summary" | "task";
        title: string;
        excerpt: string;
        similarityScore: number;
        recordingId?: string;
        timestamp?: number;
        recordingDate?: string;
        projectName?: string;
        projectId?: string;
      }>;
    }>
  > {
    try {
      const searchResult = await this.searchOrganizationWide(
        query,
        organizationId,
        {
          matchThreshold: 0.6, // Higher threshold for better relevance
          matchCount: 12, // Get more results for org-wide search
        }
      );

      if (searchResult.isErr()) {
        return err(searchResult.error);
      }

      const results = searchResult.value;

      const context = this.buildContextFromResults(results);
      const sources = this.formatSourceCitations(results).map((source) => ({
        ...source,
        projectId: results.find((r) => r.contentId === source.contentId)
          ?.metadata.projectId as string | undefined,
      }));

      return ok({ context, sources });
    } catch (error) {
      logger.error("Error getting organization-wide relevant context", {
        error,
        query,
        organizationId,
      });
      return err(
        ActionErrors.internal(
          "Error getting organization-wide relevant context",
          error as Error,
          "VectorSearchService.getRelevantContextOrganizationWide"
        )
      );
    }
  }
}

