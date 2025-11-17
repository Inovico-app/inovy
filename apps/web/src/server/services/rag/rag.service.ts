/**
 * File: lib/rag/qdrant-rag.ts
 *
 * Main RAG client combining all retrieval strategies
 */

import { ActionErrors, type ActionResult } from "@/lib/action-errors";
import { logger } from "@/lib/logger";
import { AIInsightsQueries } from "@/server/data-access/ai-insights.queries";
import { ProjectTemplateQueries } from "@/server/data-access/project-templates.queries";
import { RecordingsQueries } from "@/server/data-access/recordings.queries";
import { TasksQueries } from "@/server/data-access/tasks.queries";
import { EmbeddingService } from "@/server/services/embedding.service";
import {
  QdrantClientService,
  type QdrantPoint,
} from "@/server/services/rag/qdrant.service";
import { randomUUID } from "crypto";
import { err, ok } from "neverthrow";
import {
  HybridSearchEngine,
  type HybridSearchOptions,
} from "./hybrid-search.service";
import { RerankerService } from "./reranker.service";
// SearchResult interface - shared across RAG services
export interface SearchResult {
  id: string;
  contentType:
    | "recording"
    | "transcription"
    | "summary"
    | "task"
    | "knowledge_document";
  contentId: string;
  contentText: string;
  similarity: number;
  rerankedScore?: number; // Cross-encoder score from re-ranking
  originalScore?: number; // Original similarity score (preserved from similarity field)
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

export interface RAGSearchOptions {
  limit?: number;
  useHybrid?: boolean;
  useReranking?: boolean;
  filters?: Record<string, unknown>;
  vectorWeight?: number;
  keywordWeight?: number;
  scoreThreshold?: number;
  organizationId?: string;
  projectId?: string;
}

export class RAGService {
  private qdrantService: QdrantClientService;
  private hybridSearch: HybridSearchEngine;
  private reranker: RerankerService;
  private embeddingService: EmbeddingService;
  private readonly collectionName: string;

  constructor(collectionName?: string) {
    this.collectionName = collectionName ?? "knowledge_base";
    this.qdrantService = QdrantClientService.getInstance();
    this.hybridSearch = new HybridSearchEngine(this.collectionName);
    this.reranker = new RerankerService();
    this.embeddingService = new EmbeddingService();
  }

  /**
   * Initialize Qdrant collection and payload indices
   * Idempotent - safe to call multiple times
   */
  async initialize(): Promise<ActionResult<void>> {
    return await this.qdrantService.initialize(this.collectionName);
  }

  /**
   * Advanced search with multiple strategies
   *
   * Pipeline:
   * 1. Generate query embedding
   * 2. Hybrid search (vector + keyword)
   * 3. Re-rank top results
   * 4. Apply metadata filtering
   */
  async search(
    query: string,
    userId: string = "",
    options: RAGSearchOptions = {}
  ): Promise<ActionResult<SearchResult[]>> {
    try {
      const {
        limit = 5,
        useHybrid = true,
        useReranking = true,
        filters = {},
        vectorWeight = 0.7,
        keywordWeight = 0.3,
        scoreThreshold = 0.5,
        organizationId,
        projectId,
      } = options;

      logger.debug("Performing RAG search", {
        component: "RAGService",
        queryLength: query.length,
        userId,
        limit,
        useHybrid,
        useReranking,
      });

      // Ensure Qdrant is initialized
      const initResult = await this.initialize();
      if (initResult.isErr()) {
        return err(initResult.error);
      }

      // 1. Generate query embedding
      const queryEmbeddingResult =
        await this.embeddingService.generateEmbedding(query);

      if (queryEmbeddingResult.isErr()) {
        return err(queryEmbeddingResult.error);
      }

      const queryEmbedding = queryEmbeddingResult.value;

      // 2. Perform search
      let results: SearchResult[];

      if (useHybrid) {
        const hybridOptions: HybridSearchOptions = {
          userId,
          organizationId,
          projectId,
          limit: limit * 2, // Fetch more for re-ranking
          vectorWeight,
          keywordWeight,
          scoreThreshold,
          filters,
          collectionName: this.collectionName,
        };

        const hybridResult = await this.hybridSearch.search(
          query,
          queryEmbedding,
          hybridOptions
        );

        if (hybridResult.isErr()) {
          return err(hybridResult.error);
        }

        results = hybridResult.value;
      } else {
        // Simple vector search
        const vectorResult = await this.vectorOnlySearch(
          queryEmbedding,
          userId,
          limit * 2,
          filters,
          organizationId,
          projectId
        );

        if (vectorResult.isErr()) {
          return err(vectorResult.error);
        }

        results = vectorResult.value;
      }

      // 3. Re-rank if enabled
      if (useReranking && results.length > 0) {
        const rerankResult = await this.reranker.rerank(query, results, limit);
        if (rerankResult.isOk()) {
          results = rerankResult.value;
        }
        // If re-ranking fails, continue with original results (non-blocking)
      } else {
        results = results.slice(0, limit);
      }

      logger.debug("RAG search completed", {
        component: "RAGService",
        resultsCount: results.length,
        reranked: useReranking,
      });

      return ok(results);
    } catch (error) {
      logger.error("Error performing RAG search", {
        component: "RAGService",
        error: error instanceof Error ? error.message : String(error),
      });
      return err(
        ActionErrors.internal(
          "Error performing RAG search",
          error as Error,
          "RAGService.search"
        )
      );
    }
  }

  /**
   * Simple vector-only search without hybrid or re-ranking
   */
  private async vectorOnlySearch(
    embedding: number[],
    userId: string,
    limit: number,
    filters: Record<string, unknown>,
    organizationId?: string,
    projectId?: string
  ): Promise<ActionResult<SearchResult[]>> {
    try {
      const filter = this.buildFilter(
        userId,
        organizationId,
        projectId,
        filters
      );

      const searchResult = await this.qdrantService.search(embedding, {
        limit,
        filter,
        collectionName: this.collectionName,
      });

      if (searchResult.isErr()) {
        return err(searchResult.error);
      }

      const results: SearchResult[] = searchResult.value.map((result) => {
        const payload = result.payload;
        return {
          id: String(result.id),
          contentType:
            (payload?.contentType as SearchResult["contentType"]) ??
            "knowledge_document",
          contentId: (payload?.documentId as string) ?? String(result.id),
          contentText: (payload?.content as string) ?? "",
          similarity: result.score,
          metadata: payload
            ? {
                title: payload.filename as string | undefined,
                documentId: payload.documentId as string | undefined,
                documentTitle: payload.filename as string | undefined,
                ...payload,
              }
            : {},
        };
      });

      return ok(results);
    } catch (error) {
      logger.error("Error in vector-only search", {
        component: "RAGService",
        error: error instanceof Error ? error.message : String(error),
      });
      return err(
        ActionErrors.internal(
          "Error in vector-only search",
          error as Error,
          "RAGService.vectorOnlySearch"
        )
      );
    }
  }

  /**
   * Add a single document to Qdrant
   */
  async addDocument(
    content: string,
    metadata: Record<string, unknown>,
    userId: string,
    organizationId: string
  ): Promise<ActionResult<void>> {
    try {
      // Generate embedding
      const embeddingResult = await this.embeddingService.generateEmbedding(
        content
      );

      if (embeddingResult.isErr()) {
        return err(embeddingResult.error);
      }

      const embedding = embeddingResult.value;

      // Prepare Qdrant point
      const point: QdrantPoint = {
        id: randomUUID(),
        vector: embedding,
        payload: {
          content,
          userId,
          organizationId,
          ...metadata,
          timestamp: new Date().toISOString(),
        },
      };

      // Upsert to Qdrant
      const upsertResult = await this.qdrantService.upsert(
        [point],
        this.collectionName
      );

      if (upsertResult.isErr()) {
        return err(upsertResult.error);
      }

      logger.debug("Document added to Qdrant", {
        component: "RAGService",
        documentId: point.id,
        userId,
      });

      return ok(undefined);
    } catch (error) {
      logger.error("Error adding document", {
        component: "RAGService",
        error: error instanceof Error ? error.message : String(error),
      });
      return err(
        ActionErrors.internal(
          "Error adding document",
          error as Error,
          "RAGService.addDocument"
        )
      );
    }
  }

  /**
   * Batch add documents with optimized embedding generation
   */
  async addDocumentBatch(
    documents: Array<{
      content: string;
      metadata: Record<string, unknown>;
    }>,
    userId: string,
    organizationId: string
  ): Promise<ActionResult<void>> {
    try {
      if (documents.length === 0) {
        return ok(undefined);
      }

      logger.debug("Batch adding documents", {
        component: "RAGService",
        documentCount: documents.length,
        userId,
      });

      // Generate embeddings in batch
      const contents = documents.map((d) => d.content);
      const embeddingsResult =
        await this.embeddingService.generateEmbeddingsBatch(contents);

      if (embeddingsResult.isErr()) {
        return err(embeddingsResult.error);
      }

      const embeddings = embeddingsResult.value;

      if (embeddings.length !== documents.length) {
        return err(
          ActionErrors.internal(
            "Mismatch between documents and embeddings",
            undefined,
            "RAGService.addDocumentBatch"
          )
        );
      }

      // Prepare points
      const points: QdrantPoint[] = documents.map((doc, index) => ({
        id: randomUUID(),
        vector: embeddings[index] ?? [],
        payload: {
          content: doc.content,
          userId,
          organizationId,
          ...doc.metadata,
          timestamp: new Date().toISOString(),
        },
      }));

      // Batch upsert (Qdrant handles up to 100 points efficiently)
      const batchSize = 100;
      let succeededCount = 0;
      let failedCount = 0;
      let firstErrorMessage: string | undefined;

      for (let i = 0; i < points.length; i += batchSize) {
        const batch = points.slice(i, i + batchSize);
        const upsertResult = await this.qdrantService.upsert(
          batch,
          this.collectionName
        );

        if (upsertResult.isErr()) {
          failedCount += batch.length;
          firstErrorMessage ??= upsertResult.error.message;
          logger.error("Failed to upsert batch", {
            component: "RAGService",
            batchIndex: i,
            batchSize: batch.length,
            error: upsertResult.error.message,
          });
          // Continue with remaining batches
          continue;
        }

        succeededCount += batch.length;
      }

      if (failedCount > 0) {
        logger.error("Some batches failed to upsert", {
          component: "RAGService",
          succeeded: succeededCount,
          failed: failedCount,
          error: firstErrorMessage,
        });
        return err(
          ActionErrors.internal(
            "Some batches failed to upsert",
            {
              succeeded: succeededCount,
              failed: failedCount,
              error: firstErrorMessage,
            },
            "RAGService.addDocumentBatch"
          )
        );
      }

      logger.debug("Batch documents added to Qdrant", {
        component: "RAGService",
        documentCount: documents.length,
        userId,
      });

      return ok(undefined);
    } catch (error) {
      logger.error("Error batch adding documents", {
        component: "RAGService",
        error: error instanceof Error ? error.message : String(error),
      });
      return err(
        ActionErrors.internal(
          "Error batch adding documents",
          error as Error,
          "RAGService.addDocumentBatch"
        )
      );
    }
  }

  /**
   * Build Qdrant filter from options
   */
  private buildFilter(
    userId: string,
    organizationId: string | undefined,
    projectId: string | undefined,
    additionalFilters: Record<string, unknown>
  ): {
    must?: Array<{
      key: string;
      match?: { value?: string | string[]; text?: string };
    }>;
  } {
    const must: Array<{
      key: string;
      match?: { value?: string | string[]; text?: string };
    }> = [];

    // Only add userId filter if provided
    if (userId) {
      must.push({
        key: "userId",
        match: { value: userId },
      });
    }

    if (organizationId) {
      must.push({
        key: "organizationId",
        match: { value: organizationId },
      });
    }

    if (projectId) {
      must.push({
        key: "projectId",
        match: { value: projectId },
      });
    }

    // Add additional filters
    Object.entries(additionalFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          // Handle array values (match any value in array)
          must.push({
            key,
            match: { value: value.map((v) => String(v)) },
          });
        } else if (
          typeof value === "object" &&
          value !== null &&
          ("gte" in value || "lte" in value || "gt" in value || "lt" in value)
        ) {
          // Range filters would need to be handled differently in Qdrant
          // For now, skip range filters or implement separately
          logger.warn("Range filters not yet implemented for Qdrant", {
            component: "RAGService",
            key,
            value,
          });
        } else {
          // Handle simple value match
          must.push({
            key,
            match: { value: String(value) },
          });
        }
      }
    });

    return must.length > 0 ? { must } : {};
  }

  /**
   * Delete all user data from Qdrant
   */
  async deleteUserData(userId: string): Promise<ActionResult<void>> {
    try {
      const deleteResult = await this.qdrantService.deleteByFilter(
        {
          must: [
            {
              key: "userId",
              match: { value: userId },
            },
          ],
        },
        this.collectionName
      );

      if (deleteResult.isErr()) {
        return err(deleteResult.error);
      }

      logger.info("User data deleted from Qdrant", {
        component: "RAGService",
        userId,
      });

      return ok(undefined);
    } catch (error) {
      logger.error("Error deleting user data", {
        component: "RAGService",
        error: error instanceof Error ? error.message : String(error),
      });
      return err(
        ActionErrors.internal(
          "Error deleting user data",
          error as Error,
          "RAGService.deleteUserData"
        )
      );
    }
  }

  /**
   * Update projectId for documents matching contentId and contentType
   */
  async updateProjectId(
    contentId: string,
    contentType: string,
    newProjectId: string
  ): Promise<ActionResult<void>> {
    try {
      const updateResult = await this.qdrantService.setPayload(
        { projectId: newProjectId },
        {
          must: [
            {
              key: "contentId",
              match: { value: contentId },
            },
            {
              key: "contentType",
              match: { value: contentType },
            },
          ],
        },
        this.collectionName
      );

      if (updateResult.isErr()) {
        return err(updateResult.error);
      }

      logger.info("Updated projectId in Qdrant", {
        component: "RAGService",
        contentId,
        contentType,
        newProjectId,
      });

      return ok(undefined);
    } catch (error) {
      logger.error("Error updating projectId", {
        component: "RAGService",
        error: error instanceof Error ? error.message : String(error),
      });
      return err(
        ActionErrors.internal(
          "Error updating projectId",
          error as Error,
          "RAGService.updateProjectId"
        )
      );
    }
  }

  /**
   * Delete documents by organization and content type
   */
  async deleteByOrganizationAndContentType(
    organizationId: string,
    contentType: string
  ): Promise<ActionResult<void>> {
    try {
      const deleteResult = await this.qdrantService.deleteByFilter(
        {
          must: [
            {
              key: "organizationId",
              match: { value: organizationId },
            },
            {
              key: "contentType",
              match: { value: contentType },
            },
          ],
        },
        this.collectionName
      );

      if (deleteResult.isErr()) {
        return err(deleteResult.error);
      }

      logger.info("Documents deleted from Qdrant", {
        component: "RAGService",
        organizationId,
        contentType,
      });

      return ok(undefined);
    } catch (error) {
      logger.error("Error deleting documents", {
        component: "RAGService",
        error: error instanceof Error ? error.message : String(error),
      });
      return err(
        ActionErrors.internal(
          "Error deleting documents",
          error as Error,
          "RAGService.deleteByOrganizationAndContentType"
        )
      );
    }
  }

  /**
   * Get statistics about user's knowledge base
   */
  async getUserStats(userId: string): Promise<
    ActionResult<{
      totalDocuments: number;
      totalChunks: number;
      storageSize: number;
    }>
  > {
    try {
      const scrollResult = await this.qdrantService.scroll(
        {
          must: [
            {
              key: "userId",
              match: { value: userId },
            },
          ],
        },
        {
          limit: 10000,
          collectionName: this.collectionName,
        }
      );

      if (scrollResult.isErr()) {
        return err(scrollResult.error);
      }

      const points = scrollResult.value;
      const uniqueDocuments = new Set(
        points
          .map((p) => p.payload?.documentId as string | undefined)
          .filter((id): id is string => id !== undefined)
      ).size;

      // Approximate storage size (vector dimensions * 4 bytes per float32)
      const vectorSize = 3072 * 4; // Using text-embedding-3-large dimensions
      const storageSize = points.length * vectorSize;

      return ok({
        totalDocuments: uniqueDocuments,
        totalChunks: points.length,
        storageSize,
      });
    } catch (error) {
      logger.error("Error getting user stats", {
        component: "RAGService",
        error: error instanceof Error ? error.message : String(error),
      });
      return err(
        ActionErrors.internal(
          "Error getting user stats",
          error as Error,
          "RAGService.getUserStats"
        )
      );
    }
  }

  /**
   * Chunk long text into smaller pieces for embedding
   */
  private chunkText(text: string, maxTokens: number): string[] {
    // Simple chunking by character count (approximation: ~4 chars per token)
    const maxChars = maxTokens * 4;
    const chunks: string[] = [];

    if (text.length <= maxChars) {
      return [text];
    }

    // Split by paragraphs first
    const paragraphs = text.split(/\n\n+/);
    let currentChunk = "";

    for (const paragraph of paragraphs) {
      if ((currentChunk + paragraph).length <= maxChars) {
        currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
        }
        // If single paragraph is too long, split by sentences
        if (paragraph.length > maxChars) {
          const sentences = paragraph.match(/[^.!?]+[.!?]+/g) ?? [paragraph];
          currentChunk = "";
          for (const sentence of sentences) {
            if ((currentChunk + sentence).length <= maxChars) {
              currentChunk += sentence;
            } else {
              if (currentChunk) {
                chunks.push(currentChunk);
              }
              currentChunk = sentence;
            }
          }
        } else {
          currentChunk = paragraph;
        }
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks.length > 0 ? chunks : [text];
  }

  /**
   * Index a recording's transcription
   */
  async indexRecordingTranscription(
    recordingId: string,
    projectId: string,
    organizationId: string
  ): Promise<ActionResult<void>> {
    try {
      logger.info("Indexing recording transcription", { recordingId });

      const recording = await RecordingsQueries.selectRecordingById(
        recordingId
      );

      if (!recording || !recording.transcriptionText) {
        return err(
          ActionErrors.notFound(
            "Recording or transcription",
            "RAGService.indexRecordingTranscription"
          )
        );
      }

      // Chunk the transcription
      const chunks = this.chunkText(recording.transcriptionText, 500);

      // Prepare documents for Qdrant batch indexing
      const documents = chunks.map((chunk, index) => ({
        content: chunk,
        metadata: {
          contentType: "transcription",
          documentId: recordingId,
          contentId: recordingId,
          projectId,
          filename: recording.title,
          recordingTitle: recording.title,
          recordingDate: recording.recordingDate.toISOString(),
          chunkIndex: index,
          totalChunks: chunks.length,
        },
      }));

      // Index to Qdrant using batch operation
      const indexResult = await this.addDocumentBatch(
        documents,
        recording.createdById,
        organizationId
      );

      if (indexResult.isErr()) {
        return err(indexResult.error);
      }

      logger.info("Successfully indexed transcription", {
        recordingId,
        chunksCreated: chunks.length,
      });

      return ok(undefined);
    } catch (error) {
      logger.error("Error indexing recording transcription", {
        error,
        recordingId,
      });
      return err(
        ActionErrors.internal(
          "Error indexing recording transcription",
          error as Error,
          "RAGService.indexRecordingTranscription"
        )
      );
    }
  }

  /**
   * Index a recording's summary
   */
  async indexRecordingSummary(
    recordingId: string,
    projectId: string,
    organizationId: string
  ): Promise<ActionResult<void>> {
    try {
      logger.info("Indexing recording summary", { recordingId });

      const summaries = await AIInsightsQueries.getInsightsByRecordingId(
        recordingId
      );
      const summary = summaries.find(
        (s: { insightType: string }) => s.insightType === "summary"
      );

      if (!summary || !summary.content) {
        return err(
          ActionErrors.notFound("Summary", "RAGService.indexRecordingSummary")
        );
      }

      // Convert summary content to text
      const summaryText = JSON.stringify(summary.content);

      // Get recording details for metadata
      const recording = await RecordingsQueries.selectRecordingById(
        recordingId
      );

      // Index to Qdrant
      const indexResult = await this.addDocument(
        summaryText,
        {
          contentType: "summary",
          documentId: summary.id,
          contentId: summary.id,
          projectId,
          filename: recording?.title,
          recordingTitle: recording?.title,
          recordingDate: recording?.recordingDate?.toISOString(),
          recordingId,
        },
        recording?.createdById ?? "",
        organizationId
      );

      if (indexResult.isErr()) {
        return err(indexResult.error);
      }

      logger.info("Successfully indexed summary", { summaryId: summary.id });

      return ok(undefined);
    } catch (error) {
      logger.error("Error indexing recording summary", { error, recordingId });
      return err(
        ActionErrors.internal(
          "Error indexing recording summary",
          error as Error,
          "RAGService.indexRecordingSummary"
        )
      );
    }
  }

  /**
   * Index all tasks for a recording
   */
  async indexRecordingTasks(
    recordingId: string,
    projectId: string,
    organizationId: string
  ): Promise<ActionResult<void>> {
    try {
      logger.info("Indexing recording tasks", { recordingId });

      const tasks = await TasksQueries.getTasksByRecordingId(recordingId);

      if (!tasks || tasks.length === 0) {
        logger.info("No tasks found for recording", { recordingId });
        return ok(undefined);
      }

      // Get recording details for metadata
      const recording = await RecordingsQueries.selectRecordingById(
        recordingId
      );

      // Prepare documents for Qdrant batch indexing
      const documents = tasks.map((task) => ({
        content: `Task: ${task.title}\nDescription: ${
          task.description ?? "N/A"
        }\nPriority: ${task.priority}\nStatus: ${task.status}`,
        metadata: {
          contentType: "task",
          documentId: task.id,
          contentId: task.id,
          projectId,
          title: task.title,
          priority: task.priority,
          status: task.status,
          recordingTitle: recording?.title,
          recordingDate: recording?.recordingDate?.toISOString(),
          recordingId,
        },
      }));

      // Index to Qdrant using batch operation
      const indexResult = await this.addDocumentBatch(
        documents,
        recording?.createdById ?? "",
        organizationId
      );

      if (indexResult.isErr()) {
        return err(indexResult.error);
      }

      logger.info("Successfully indexed tasks", {
        recordingId,
        tasksIndexed: tasks.length,
      });

      return ok(undefined);
    } catch (error) {
      logger.error("Error indexing recording tasks", { error, recordingId });
      return err(
        ActionErrors.internal(
          "Error indexing recording tasks",
          error as Error,
          "RAGService.indexRecordingTasks"
        )
      );
    }
  }

  /**
   * Index all content for a recording
   */
  async indexRecording(
    recordingId: string,
    projectId: string,
    organizationId: string
  ): Promise<ActionResult<void>> {
    try {
      logger.info("Starting full recording indexing", { recordingId });

      // Index transcription
      const transcriptionResult = await this.indexRecordingTranscription(
        recordingId,
        projectId,
        organizationId
      );
      if (transcriptionResult.isErr()) {
        logger.warn("Failed to index transcription", {
          recordingId,
          error: transcriptionResult.error,
        });
      }

      // Index summary
      const summaryResult = await this.indexRecordingSummary(
        recordingId,
        projectId,
        organizationId
      );
      if (summaryResult.isErr()) {
        logger.warn("Failed to index summary", {
          recordingId,
          error: summaryResult.error,
        });
      }

      // Index tasks
      const tasksResult = await this.indexRecordingTasks(
        recordingId,
        projectId,
        organizationId
      );
      if (tasksResult.isErr()) {
        logger.warn("Failed to index tasks", {
          recordingId,
          error: tasksResult.error,
        });
      }

      logger.info("Completed full recording indexing", { recordingId });

      return ok(undefined);
    } catch (error) {
      logger.error("Error indexing recording", { error, recordingId });
      return err(
        ActionErrors.internal(
          "Error indexing recording",
          error as Error,
          "RAGService.indexRecording"
        )
      );
    }
  }

  /**
   * Index a project template for RAG context
   */
  async indexProjectTemplate(
    projectId: string,
    organizationId: string
  ): Promise<ActionResult<void>> {
    try {
      logger.info("Indexing project template", { projectId });

      const template = await ProjectTemplateQueries.findByProjectId(
        projectId,
        organizationId
      );

      if (!template) {
        logger.info("No project template found, skipping", { projectId });
        return ok(undefined);
      }

      // Chunk the template instructions
      const chunks = this.chunkText(template.instructions, 500);

      // Prepare documents for Qdrant batch indexing
      const documents = chunks.map((chunk, index) => ({
        content: chunk,
        metadata: {
          contentType: "project_template",
          documentId: template.id,
          contentId: template.id,
          projectId,
          filename: "Project Template",
          title: "Project Template",
          chunkIndex: index,
          totalChunks: chunks.length,
        },
      }));

      // Index to Qdrant using batch operation
      // Note: userId is not available for project templates, using empty string
      const indexResult = await this.addDocumentBatch(
        documents,
        "",
        organizationId
      );

      if (indexResult.isErr()) {
        return err(indexResult.error);
      }

      logger.info("Successfully indexed project template", {
        projectId,
        chunksCreated: chunks.length,
      });

      return ok(undefined);
    } catch (error) {
      logger.error("Error indexing project template", { error, projectId });
      return err(
        ActionErrors.internal(
          "Error indexing project template",
          error as Error,
          "RAGService.indexProjectTemplate"
        )
      );
    }
  }

  /**
   * Index organization instructions for RAG context
   */
  async indexOrganizationInstructions(
    organizationId: string,
    instructions: string,
    settingsId: string
  ): Promise<ActionResult<void>> {
    try {
      logger.info("Indexing organization instructions", { organizationId });

      // Chunk the instructions (max 500 tokens per chunk as per acceptance criteria)
      const chunks = this.chunkText(instructions, 500);

      // Prepare documents for Qdrant batch indexing
      const documents = chunks.map((chunk, index) => ({
        content: chunk,
        metadata: {
          contentType: "organization_instructions",
          documentId: settingsId,
          contentId: settingsId,
          filename: "Organization Instructions",
          title: "Organization Instructions",
          chunkIndex: index,
          totalChunks: chunks.length,
        },
      }));

      // Index to Qdrant using batch operation
      // Note: userId is not available for organization instructions, using empty string
      const indexResult = await this.addDocumentBatch(
        documents,
        "",
        organizationId
      );

      if (indexResult.isErr()) {
        return err(indexResult.error);
      }

      logger.info("Successfully indexed organization instructions", {
        organizationId,
        chunksCreated: chunks.length,
      });

      return ok(undefined);
    } catch (error) {
      logger.error("Error indexing organization instructions", {
        error,
        organizationId,
      });
      return err(
        ActionErrors.internal(
          "Error indexing organization instructions",
          error as Error,
          "RAGService.indexOrganizationInstructions"
        )
      );
    }
  }

  /**
   * Reindex organization instructions (deletes old, creates new)
   */
  async reindexOrganizationInstructions(
    organizationId: string,
    instructions: string,
    settingsId: string
  ): Promise<ActionResult<void>> {
    try {
      logger.info("Reindexing organization instructions", { organizationId });

      // Delete existing organization instructions from Qdrant
      const deleteResult = await this.deleteByOrganizationAndContentType(
        organizationId,
        "organization_instructions"
      );
      if (deleteResult.isErr()) {
        logger.warn("Failed to delete existing organization instructions", {
          organizationId,
          error: deleteResult.error,
        });
        // Continue with reindexing anyway
      }

      // Index new instructions
      return await this.indexOrganizationInstructions(
        organizationId,
        instructions,
        settingsId
      );
    } catch (error) {
      logger.error("Error reindexing organization instructions", {
        error,
        organizationId,
      });
      return err(
        ActionErrors.internal(
          "Error reindexing organization instructions",
          error as Error,
          "RAGService.reindexOrganizationInstructions"
        )
      );
    }
  }

  /**
   * Index all recordings and project template in a project
   */
  async indexProject(
    projectId: string,
    organizationId: string
  ): Promise<ActionResult<{ indexed: number; failed: number }>> {
    try {
      logger.info("Starting project indexing", { projectId });

      // First, index project template (if exists)
      const templateResult = await this.indexProjectTemplate(
        projectId,
        organizationId
      );

      if (templateResult.isErr()) {
        logger.warn("Failed to index project template", {
          projectId,
          error: templateResult.error.message,
        });
        // Continue indexing recordings even if template indexing fails
      }

      const recordings = await RecordingsQueries.selectRecordingsByProjectId(
        projectId,
        organizationId
      );

      let indexed = 0;
      let failed = 0;

      for (const recording of recordings) {
        const result = await this.indexRecording(
          recording.id,
          projectId,
          organizationId
        );

        if (result.isOk()) {
          indexed++;
        } else {
          failed++;
        }
      }

      logger.info("Completed project indexing", { projectId, indexed, failed });

      return ok({ indexed, failed });
    } catch (error) {
      logger.error("Error indexing project", { error, projectId });
      return err(
        ActionErrors.internal(
          "Error indexing project",
          error as Error,
          "RAGService.indexProject"
        )
      );
    }
  }
}

