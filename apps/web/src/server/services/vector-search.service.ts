import { logger } from "@/lib/logger";
import { EmbeddingsQueries } from "@/server/data-access/embeddings.queries";
import { EmbeddingService } from "./embedding.service";
import { RecordingsQueries } from "@/server/data-access/recordings.queries";
import { err, ok, type Result } from "neverthrow";

export interface SearchResult {
  id: string;
  contentType: "recording" | "transcription" | "summary" | "task";
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
  ): Promise<Result<SearchResult[], Error>> {
    try {
      logger.info("Performing vector search", { query, projectId, options });

      // Generate embedding for the query
      const queryEmbeddingResult =
        await EmbeddingService.generateEmbedding(query);

      if (queryEmbeddingResult.isErr()) {
        return err(queryEmbeddingResult.error);
      }

      const queryEmbedding = queryEmbeddingResult.value;

      // Search for similar embeddings
      const results = await EmbeddingsQueries.searchSimilar(
        queryEmbedding,
        projectId,
        {
          matchThreshold: options.matchThreshold || 0.5,
          matchCount: options.matchCount || 10,
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

      logger.info("Vector search completed", {
        query,
        projectId,
        resultsCount: searchResults.length,
      });

      return ok(searchResults);
    } catch (error) {
      logger.error("Error performing vector search", { error, query, projectId });
      return err(
        error instanceof Error ? error : new Error("Unknown error")
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

    return contextParts.join("\n");
  }

  /**
   * Format search results as source citations
   */
  static formatSourceCitations(
    results: SearchResult[]
  ): Array<{
    contentId: string;
    contentType: "recording" | "transcription" | "summary" | "task";
    title: string;
    excerpt: string;
    similarityScore: number;
    recordingId?: string;
    timestamp?: number;
  }> {
    return results.map((result) => ({
      contentId: result.contentId,
      contentType: result.contentType,
      title:
        result.metadata.title ||
        result.metadata.recordingTitle ||
        "Untitled",
      excerpt:
        result.contentText.length > 200
          ? result.contentText.substring(0, 200) + "..."
          : result.contentText,
      similarityScore: result.similarity,
      recordingId: result.metadata.recordingId,
      timestamp: result.metadata.timestamp,
    }));
  }

  /**
   * Get relevant context for a user query
   */
  static async getRelevantContext(
    query: string,
    projectId: string
  ): Promise<
    Result<
      {
        context: string;
        sources: Array<{
          contentId: string;
          contentType: "recording" | "transcription" | "summary" | "task";
          title: string;
          excerpt: string;
          similarityScore: number;
          recordingId?: string;
          timestamp?: number;
        }>;
      },
      Error
    >
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
      logger.error("Error getting relevant context", { error, query, projectId });
      return err(
        error instanceof Error ? error : new Error("Unknown error")
      );
    }
  }
}

