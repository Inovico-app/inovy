/**
 * File: lib/rag/qdrant-rag.ts
 *
 * Main RAG client combining all retrieval strategies
 */

import { ActionErrors, type ActionResult } from "@/lib/action-errors";
import { logger } from "@/lib/logger";
import { EmbeddingService } from "@/server/services/embedding.service";
import {
  QdrantClientService,
  type QdrantPoint,
} from "@/server/services/rag/qdrant.service";
import { type SearchResult } from "@/server/services/rag/vector-search.service";
import { randomUUID } from "crypto";
import { err, ok } from "neverthrow";
import {
  HybridSearchEngine,
  type HybridSearchOptions,
} from "./hybrid-search.service";
import { RerankerService } from "./reranker.service";

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
  private readonly collectionName: string;

  constructor(collectionName?: string) {
    this.collectionName = collectionName ?? "knowledge_base";
    this.qdrantService = QdrantClientService.getInstance();
    this.hybridSearch = new HybridSearchEngine(this.collectionName);
    this.reranker = new RerankerService();
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
    userId: string,
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
      const queryEmbeddingResult = await EmbeddingService.generateEmbedding(
        query
      );

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
      const embeddingResult = await EmbeddingService.generateEmbedding(content);

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
      const embeddingsResult = await EmbeddingService.generateEmbeddingsBatch(
        contents
      );

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
      for (let i = 0; i < points.length; i += batchSize) {
        const batch = points.slice(i, i + batchSize);
        const upsertResult = await this.qdrantService.upsert(
          batch,
          this.collectionName
        );

        if (upsertResult.isErr()) {
          logger.error("Failed to upsert batch", {
            component: "RAGService",
            batchIndex: i,
            batchSize: batch.length,
            error: upsertResult.error.message,
          });
          // Continue with remaining batches
          continue;
        }
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
    }> = [
      {
        key: "userId",
        match: { value: userId },
      },
    ];

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
      const vectorSize = 1536 * 4; // Using text-embedding-3-small dimensions
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
}

