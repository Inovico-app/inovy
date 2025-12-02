import { logger } from "@/lib/logger";
import {
  ActionErrors,
  type ActionResult,
} from "@/lib/server-action-client/action-errors";
import { QdrantClient } from "@qdrant/js-client-rest";
import { err, ok } from "neverthrow";
import type {
  CollectionUpdateOptions,
  OptimizationStatus,
  QdrantFilter,
  QdrantPayload,
  QdrantPoint,
  QdrantSearchOptions,
} from "./types";

/**
 * Qdrant Vector Database Client Service
 *
 * Manages connection to Qdrant vector database and provides methods for
 * vector operations including upsert, search, and delete.
 *
 * Collection Configuration:
 * - Collection name: knowledge_base
 * - Vector size: 3072 (OpenAI text-embedding-3-large)
 * - Distance metric: Cosine
 * - HNSW index: m=16, ef_construct=100, ef_search=100-200
 * - Quantization: Scalar int8 with original vectors on disk (~75% memory reduction)
 * - On-disk payload: Enabled for large payloads
 * - Optimizer: Configured for efficient segment management
 *
 * Performance Optimizations:
 * - Scalar quantization reduces memory usage by ~75% while maintaining search accuracy
 * - On-disk payload storage frees RAM for vector operations
 * - Optimizer configuration reduces fragmentation and improves search speed
 * - ef_search parameter allows query-time tuning of accuracy vs speed
 */

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // 1s, 2s, 4s exponential backoff

export class QdrantClientService {
  private static instance: QdrantClientService | null = null;
  private client: QdrantClient;
  private readonly defaultCollectionName = "knowledge_base";
  private initializedCollections = new Set<string>();

  private constructor() {
    const qdrantUrl = process.env.QDRANT_URL ?? "http://localhost:6333";
    const qdrantApiKey = process.env.QDRANT_API_KEY ?? "";

    // Validate cloud configuration
    const isCloudHosted = qdrantUrl.startsWith("https://");
    if (isCloudHosted && !qdrantApiKey) {
      logger.warn(
        "Qdrant cloud URL detected but API key is missing. Cloud instances require QDRANT_API_KEY.",
        {
          component: "QdrantClientService",
          url: qdrantUrl,
        }
      );
    }

    this.client = new QdrantClient({
      url: qdrantUrl,
      apiKey: qdrantApiKey,
    });

    logger.info("QdrantClientService initialized", {
      component: "QdrantClientService",
      url: qdrantUrl,
      isCloudHosted,
      hasApiKey: !!qdrantApiKey,
    });
  }

  /**
   * Get singleton instance of QdrantClientService
   */
  static getInstance(): QdrantClientService {
    QdrantClientService.instance ??= new QdrantClientService();
    return QdrantClientService.instance;
  }

  /**
   * Initialize collection and payload indices
   * Idempotent - safe to call multiple times
   *
   * Creates an optimized collection with:
   * - Scalar quantization (int8) for ~75% memory reduction
   * - On-disk payload storage for large payloads
   * - Optimizer configuration for efficient segment management
   * - HNSW index with optimized parameters
   *
   * New collections are automatically created with these optimizations.
   * Existing collections can be optimized using updateCollection() and optimizeCollection().
   */
  async initialize(collectionName?: string): Promise<ActionResult<void>> {
    const targetCollection = collectionName ?? this.defaultCollectionName;

    if (this.initializedCollections.has(targetCollection)) {
      return ok(undefined);
    }

    return await this.executeWithRetry(async () => {
      // Check if collection exists
      const collections = await this.client.getCollections();
      const collectionExists = collections.collections.some(
        (c) => c.name === targetCollection
      );

      if (!collectionExists) {
        logger.info("Creating optimized Qdrant collection", {
          component: "QdrantClientService",
          collectionName: targetCollection,
        });

        await this.client.createCollection(targetCollection, {
          vectors: {
            size: 3072, // OpenAI text-embedding-3-large dimensions
            distance: "Cosine",
            on_disk: true, // Store original vectors on disk
          },
          hnsw_config: {
            m: 16, // Number of connections per node (good balance)
            ef_construct: 100, // Construction time accuracy/speed trade-off
          },
          quantization_config: {
            scalar: {
              type: "int8",
              always_ram: true, // Keep quantized vectors in RAM for fast search
            },
          },
          on_disk_payload: true, // Store payloads on disk to free RAM
          optimizers_config: {
            default_segment_number: 2,
            max_segment_size: 100000,
            memmap_threshold: 50000,
            indexing_threshold: 20000,
          },
        });

        logger.info("Optimized Qdrant collection created", {
          component: "QdrantClientService",
          collectionName: targetCollection,
          optimizations: [
            "scalar_quantization",
            "on_disk_payload",
            "optimizer_config",
          ],
        });
      }

      // Create payload indices
      await this.createPayloadIndices(targetCollection);

      this.initializedCollections.add(targetCollection);
      return ok(undefined);
    });
  }

  /**
   * Update collection configuration
   * Allows updating optimizer settings, HNSW parameters, quantization, and payload storage
   * Note: Some changes (like enabling quantization) may require reindexing
   */
  async updateCollection(
    options: CollectionUpdateOptions,
    collectionName?: string
  ): Promise<ActionResult<void>> {
    const targetCollection = collectionName ?? this.defaultCollectionName;

    return await this.executeWithRetry(async () => {
      // Check if collection exists
      const collections = await this.client.getCollections();
      const collectionExists = collections.collections.some(
        (c) => c.name === targetCollection
      );

      if (!collectionExists) {
        return err(
          ActionErrors.notFound(
            `Collection ${targetCollection} does not exist`,
            "QdrantClientService.updateCollection"
          )
        );
      }

      logger.info("Updating Qdrant collection configuration", {
        component: "QdrantClientService",
        collectionName: targetCollection,
        updates: Object.keys(options),
      });

      const updateParams: Record<string, unknown> = {};

      if (options.optimizers_config) {
        updateParams.optimizers_config = options.optimizers_config;
      }

      if (options.hnsw_config) {
        updateParams.hnsw_config = options.hnsw_config;
      }

      if (options.quantization_config) {
        updateParams.quantization_config = options.quantization_config;
      }

      if (options.on_disk_payload !== undefined) {
        updateParams.on_disk_payload = options.on_disk_payload;
      }

      await this.client.updateCollection(targetCollection, updateParams);

      logger.info("Qdrant collection configuration updated", {
        component: "QdrantClientService",
        collectionName: targetCollection,
      });

      return ok(undefined);
    });
  }

  /**
   * Optimize collection (vacuum and merge segments)
   * Triggers Qdrant's built-in optimization to improve search performance
   * and reduce fragmentation
   */
  async optimizeCollection(
    collectionName?: string,
    options?: { wait?: boolean }
  ): Promise<ActionResult<OptimizationStatus>> {
    const targetCollection = collectionName ?? this.defaultCollectionName;

    return await this.executeWithRetry(async () => {
      // Check if collection exists
      const collections = await this.client.getCollections();
      const collectionExists = collections.collections.some(
        (c) => c.name === targetCollection
      );

      if (!collectionExists) {
        return err(
          ActionErrors.notFound(
            `Collection ${targetCollection} does not exist`,
            "QdrantClientService.optimizeCollection"
          )
        );
      }

      logger.info("Optimizing Qdrant collection", {
        component: "QdrantClientService",
        collectionName: targetCollection,
      });

      // Get collection info before optimization
      const collectionInfo = await this.client.getCollection(targetCollection);
      const beforeStatus: OptimizationStatus = {
        optimized: false,
        optimizing: false,
        segments_count: collectionInfo.segments_count ?? undefined,
        points_count: collectionInfo.points_count ?? undefined,
        indexed_points_count: collectionInfo.indexed_vectors_count ?? undefined,
      };

      // Trigger optimization by calling updateCollection with current config
      // This triggers the optimizer to run
      const currentParams = collectionInfo.config.params as {
        optimizers_config?: Record<string, unknown>;
      };
      await this.client.updateCollection(targetCollection, {
        optimizers_config: currentParams.optimizers_config as
          | Record<string, unknown>
          | undefined,
      });

      // Wait for optimization if requested
      if (options?.wait) {
        // Poll collection status until optimization completes
        let attempts = 0;
        const maxAttempts = 60; // 5 minutes max wait time
        while (attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds

          const updatedInfo = await this.client.getCollection(targetCollection);
          const optimizerStatus = updatedInfo.optimizer_status;

          // Check if optimization is still running
          const isOptimizing =
            optimizerStatus &&
            typeof optimizerStatus === "object" &&
            "error" in optimizerStatus &&
            optimizerStatus.error !== undefined;

          if (!isOptimizing) {
            const afterStatus: OptimizationStatus = {
              optimized: true,
              optimizing: false,
              segments_count: updatedInfo.segments_count ?? undefined,
              points_count: updatedInfo.points_count ?? undefined,
              indexed_points_count:
                updatedInfo.indexed_vectors_count ?? undefined,
            };

            logger.info("Qdrant collection optimization completed", {
              component: "QdrantClientService",
              collectionName: targetCollection,
              beforeSegments: beforeStatus.segments_count,
              afterSegments: afterStatus.segments_count,
            });

            return ok(afterStatus);
          }

          attempts++;
        }

        logger.warn("Qdrant collection optimization timeout", {
          component: "QdrantClientService",
          collectionName: targetCollection,
        });
      }

      const status: OptimizationStatus = {
        optimized: false,
        optimizing: true,
        segments_count: collectionInfo.segments_count ?? undefined,
        points_count: collectionInfo.points_count ?? undefined,
        indexed_points_count: collectionInfo.indexed_vectors_count ?? undefined,
      };

      return ok(status);
    });
  }

  /**
   * Create payload indices for efficient filtering
   */
  private async createPayloadIndices(collectionName: string): Promise<void> {
    try {
      const indices: Array<{
        field_name: string;
        field_schema: "keyword" | "text" | "datetime" | "integer";
      }> = [
        { field_name: "userId", field_schema: "keyword" },
        { field_name: "organizationId", field_schema: "keyword" },
        { field_name: "departmentId", field_schema: "keyword" },
        { field_name: "teamId", field_schema: "keyword" },
        { field_name: "projectId", field_schema: "keyword" },
        { field_name: "content", field_schema: "text" },
        { field_name: "filename", field_schema: "keyword" },
        { field_name: "timestamp", field_schema: "datetime" },
        { field_name: "documentId", field_schema: "keyword" },
        { field_name: "chunkIndex", field_schema: "integer" },
        { field_name: "totalChunks", field_schema: "integer" },
      ];

      for (const index of indices) {
        try {
          await this.client.createPayloadIndex(collectionName, {
            field_name: index.field_name,
            field_schema: index.field_schema as
              | "keyword"
              | "text"
              | "datetime"
              | "integer",
          });
          logger.debug("Created payload index", {
            component: "QdrantClientService",
            fieldName: index.field_name,
            fieldSchema: index.field_schema,
          });
        } catch (error) {
          // Index might already exist, which is fine
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          if (!errorMessage.includes("already exists")) {
            logger.warn("Failed to create payload index", {
              component: "QdrantClientService",
              fieldName: index.field_name,
              error: errorMessage,
            });
          }
        }
      }
    } catch (error) {
      logger.error("Error creating payload indices", {
        component: "QdrantClientService",
        error,
      });
      // Don't throw - indices might already exist
    }
  }

  /**
   * Health check - verify Qdrant connectivity
   */
  async healthCheck(): Promise<
    ActionResult<{ healthy: boolean; message?: string }>
  > {
    try {
      await this.client.getCollections();
      return ok({ healthy: true });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return ok({
        healthy: false,
        message: errorMessage,
      });
    }
  }

  /**
   * Upsert points (insert or update) into the collection
   */
  async upsert(
    points: QdrantPoint[],
    collectionName?: string
  ): Promise<ActionResult<void>> {
    const targetCollection = collectionName ?? this.defaultCollectionName;

    // Ensure collection is initialized
    const initResult = await this.initialize(targetCollection);
    if (initResult.isErr()) {
      return err(initResult.error);
    }

    return await this.executeWithRetry(async () => {
      await this.client.upsert(targetCollection, {
        wait: true,
        points: points.map((point) => ({
          id: point.id,
          vector: point.vector,
          payload: point.payload
            ? {
                ...point.payload,
                timestamp: point.payload.timestamp
                  ? typeof point.payload.timestamp === "string"
                    ? point.payload.timestamp
                    : point.payload.timestamp.toISOString()
                  : new Date().toISOString(),
              }
            : undefined,
        })),
      });

      logger.debug("Upserted points to Qdrant", {
        component: "QdrantClientService",
        collectionName: targetCollection,
        pointCount: points.length,
      });

      return ok(undefined);
    });
  }

  /**
   * Search for similar vectors
   *
   * @param queryVector - Query vector to search for
   * @param options - Search options including limit, score threshold, filter, and ef_search
   * @param options.efSearch - HNSW ef_search parameter for query-time tuning (default: 100)
   *                          Higher values improve recall at the cost of search speed
   *                          Recommended range: 100-200 for balanced performance
   */
  async search(
    queryVector: number[],
    options: QdrantSearchOptions & { collectionName?: string } = {}
  ): Promise<
    ActionResult<
      Array<{
        id: string | number;
        score: number;
        payload?: QdrantPayload;
      }>
    >
  > {
    const targetCollection =
      options.collectionName ?? this.defaultCollectionName;
    const { collectionName: _, efSearch, ...searchOptions } = options;

    // Ensure collection is initialized
    const initResult = await this.initialize(targetCollection);
    if (initResult.isErr()) {
      return err(initResult.error);
    }

    return await this.executeWithRetry(async () => {
      const searchParams: {
        vector: number[];
        limit?: number;
        score_threshold?: number | null;
        filter?: Record<string, unknown>;
        params?: { ef?: number };
      } = {
        vector: queryVector,
        limit: searchOptions.limit ?? 10,
        score_threshold: searchOptions.scoreThreshold ?? null,
        filter: searchOptions.filter as Record<string, unknown> | undefined,
      };

      // Add ef_search parameter if provided (for HNSW tuning)
      if (efSearch !== undefined && efSearch !== null) {
        searchParams.params = {
          ef: efSearch,
        };
      }

      const searchResult = await this.client.search(
        targetCollection,
        searchParams
      );

      const results = searchResult.map((result) => ({
        id: result.id,
        score: result.score ?? 0,
        payload: result.payload as QdrantPayload | undefined,
      }));

      logger.debug("Searched Qdrant collection", {
        component: "QdrantClientService",
        collectionName: targetCollection,
        resultCount: results.length,
        efSearch: efSearch ?? "default",
      });

      return ok(results);
    });
  }

  /**
   * Scroll points by filter (for keyword/full-text search)
   */
  async scroll(
    filter: QdrantFilter,
    options: {
      limit?: number;
      collectionName?: string;
    } = {}
  ): Promise<
    ActionResult<
      Array<{
        id: string | number;
        payload?: QdrantPayload;
      }>
    >
  > {
    const targetCollection =
      options.collectionName ?? this.defaultCollectionName;

    // Ensure collection is initialized
    const initResult = await this.initialize(targetCollection);
    if (initResult.isErr()) {
      return err(initResult.error);
    }

    return await this.executeWithRetry(async () => {
      const scrollResult = await this.client.scroll(targetCollection, {
        filter: filter as Record<string, unknown>,
        limit: options.limit ?? 100,
        with_payload: true,
        with_vector: false,
      });

      const results = scrollResult.points.map((point) => ({
        id: point.id,
        payload: point.payload as QdrantPayload | undefined,
      }));

      logger.debug("Scrolled Qdrant collection", {
        component: "QdrantClientService",
        collectionName: targetCollection,
        resultCount: results.length,
      });

      return ok(results);
    });
  }

  /**
   * Delete points by IDs
   */
  async delete(
    ids: (string | number)[],
    collectionName?: string
  ): Promise<ActionResult<void>> {
    const targetCollection = collectionName ?? this.defaultCollectionName;

    // Ensure collection is initialized
    const initResult = await this.initialize(targetCollection);
    if (initResult.isErr()) {
      return err(initResult.error);
    }

    return await this.executeWithRetry(async () => {
      await this.client.delete(targetCollection, {
        wait: true,
        points: ids,
      });

      logger.debug("Deleted points from Qdrant", {
        component: "QdrantClientService",
        collectionName: targetCollection,
        pointCount: ids.length,
      });

      return ok(undefined);
    });
  }

  /**
   * Delete points by filter
   */
  async deleteByFilter(
    filter: QdrantFilter,
    collectionName?: string
  ): Promise<ActionResult<void>> {
    const targetCollection = collectionName ?? this.defaultCollectionName;

    // Ensure collection is initialized
    const initResult = await this.initialize(targetCollection);
    if (initResult.isErr()) {
      return err(initResult.error);
    }

    return await this.executeWithRetry(async () => {
      await this.client.delete(targetCollection, {
        wait: true,
        filter: filter as Record<string, unknown>,
      });

      logger.debug("Deleted points by filter from Qdrant", {
        component: "QdrantClientService",
        collectionName: targetCollection,
        filter,
      });

      return ok(undefined);
    });
  }

  /**
   * Update payload for points matching a filter
   */
  async setPayload(
    payload: Record<string, unknown>,
    filter: QdrantFilter,
    collectionName?: string
  ): Promise<ActionResult<void>> {
    const targetCollection = collectionName ?? this.defaultCollectionName;

    // Ensure collection is initialized
    const initResult = await this.initialize(targetCollection);
    if (initResult.isErr()) {
      return err(initResult.error);
    }

    return await this.executeWithRetry(async () => {
      await this.client.setPayload(targetCollection, {
        payload,
        filter: filter as Record<string, unknown>,
        wait: true,
      });

      logger.debug("Updated payload in Qdrant", {
        component: "QdrantClientService",
        collectionName: targetCollection,
        filter,
      });

      return ok(undefined);
    });
  }

  /**
   * List unique documents by scrolling through points and grouping by documentId/contentId
   * Returns aggregated document metadata with chunk counts and pagination support
   */
  async listUniqueDocuments(
    filter: QdrantFilter,
    options: {
      limit?: number; // Maximum number of unique documents to return
      offset?: string | number | null; // Offset for pagination (point ID from previous page)
      scrollBatchSize?: number; // Number of points to fetch per scroll batch (default: 1000)
      collectionName?: string;
    } = {}
  ): Promise<
    ActionResult<{
      documents: Array<{
        documentId: string;
        contentId: string;
        contentType: string;
        organizationId: string;
        projectId?: string;
        filename?: string;
        fileType?: string;
        fileSize?: number;
        title?: string;
        chunksCount: number;
        uploadDate?: Date;
        metadata?: Record<string, unknown>;
      }>;
      nextOffset: string | number | null; // Offset for next page, null if no more results
      hasMore: boolean;
    }>
  > {
    const targetCollection =
      options.collectionName ?? this.defaultCollectionName;
    const maxDocuments = options.limit ?? 100; // Default to 100 unique documents
    const scrollBatchSize = options.scrollBatchSize ?? 1000; // Fetch 1000 points at a time

    // Ensure collection is initialized
    const initResult = await this.initialize(targetCollection);
    if (initResult.isErr()) {
      return err(initResult.error);
    }

    return await this.executeWithRetry(async () => {
      // Group points by documentId (preferred) or contentId
      const documentMap = new Map<
        string,
        {
          documentId: string;
          contentId: string;
          contentType: string;
          organizationId: string;
          projectId?: string;
          filename?: string;
          fileType?: string;
          fileSize?: number;
          title?: string;
          chunksCount: number;
          uploadDate?: Date;
          metadata?: Record<string, unknown>;
        }
      >();

      let currentOffset: string | number | null = options.offset ?? null;
      let hasMorePoints = true;
      let totalPointsScrolled = 0;

      // Keep scrolling until we have enough unique documents or no more points
      while (documentMap.size < maxDocuments && hasMorePoints) {
        const scrollResult = await this.client.scroll(targetCollection, {
          filter: filter as Record<string, unknown>,
          limit: scrollBatchSize,
          offset: currentOffset ?? undefined,
          with_payload: true,
          with_vector: false,
        });

        if (scrollResult.points.length === 0) {
          hasMorePoints = false;
          break;
        }

        totalPointsScrolled += scrollResult.points.length;

        // Process points and group by documentId
        for (const point of scrollResult.points) {
          const payload = point.payload as QdrantPayload | undefined;
          if (!payload) continue;

          // Skip points without organizationId and log warning
          if (!payload.organizationId) {
            logger.warn("Skipping point with missing organizationId", {
              component: "QdrantClientService",
              pointId: point.id,
              payload: {
                documentId: payload.documentId,
                contentId: payload.contentId,
                contentType: payload.contentType,
                filename: payload.filename,
                projectId: payload.projectId,
                timestamp: payload.timestamp,
              },
            });
            continue;
          }

          // Use documentId if available, otherwise fall back to contentId
          const docId =
            (payload.documentId as string) ??
            (payload.contentId as string) ??
            String(point.id);

          if (!documentMap.has(docId)) {
            // Only add if we haven't reached the limit
            if (documentMap.size >= maxDocuments) {
              // We have enough documents, but mark that there might be more
              hasMorePoints = true;
              break;
            }

            // Initialize document entry
            documentMap.set(docId, {
              documentId: docId,
              contentId: (payload.contentId as string) ?? docId,
              contentType: (payload.contentType as string) ?? "unknown",
              organizationId: payload.organizationId as string,
              projectId: payload.projectId as string | undefined,
              filename: payload.filename as string | undefined,
              fileType: payload.fileType as string | undefined,
              fileSize: payload.fileSize as number | undefined,
              title: payload.title as string | undefined,
              chunksCount: 1,
              uploadDate: payload.timestamp
                ? new Date(payload.timestamp)
                : undefined,
              metadata: payload,
            });
          } else {
            // Increment chunk count for existing document
            const doc = documentMap.get(docId);
            if (doc) {
              doc.chunksCount += 1;
              // Update upload date if this chunk is newer
              if (payload.timestamp) {
                const chunkDate = new Date(payload.timestamp);
                if (!doc.uploadDate || chunkDate > doc.uploadDate) {
                  doc.uploadDate = chunkDate;
                }
              }
            }
          }
        }

        // Check if there are more points to scroll
        // Qdrant returns next_page_offset if there are more results
        const nextPageOffset =
          (scrollResult as { next_page_offset?: string | number })
            .next_page_offset ?? null;

        if (
          nextPageOffset === null ||
          scrollResult.points.length < scrollBatchSize
        ) {
          hasMorePoints = false;
          currentOffset = null;
        } else {
          currentOffset = nextPageOffset;
          // If we've reached the document limit, we still need to check if there are more
          // by looking at whether we got a full batch
          if (documentMap.size >= maxDocuments) {
            // We have enough documents, but there might be more points
            // Set offset for next page
            break;
          }
        }
      }

      const documents = Array.from(documentMap.values());

      logger.debug("Listed unique documents from Qdrant", {
        component: "QdrantClientService",
        collectionName: targetCollection,
        documentCount: documents.length,
        totalPointsScrolled,
        hasMore: hasMorePoints && currentOffset !== null,
        nextOffset: currentOffset,
      });

      return ok({
        documents,
        nextOffset: hasMorePoints ? currentOffset : null,
        hasMore: hasMorePoints && currentOffset !== null,
      });
    });
  }

  /**
   * Execute operation with retry logic and exponential backoff
   */
  private async executeWithRetry<T>(
    operation: () => Promise<ActionResult<T>>,
    retryCount = 0
  ): Promise<ActionResult<T>> {
    try {
      const result = await operation();

      if (result.isErr() && retryCount < MAX_RETRIES) {
        const delay =
          RETRY_DELAYS[retryCount] || RETRY_DELAYS[RETRY_DELAYS.length - 1];

        // Check if error is retryable (network errors, timeouts, etc.)
        const error = result.error;
        const isRetryable =
          error.code === "SERVICE_UNAVAILABLE" ||
          error.code === "INTERNAL_SERVER_ERROR";

        if (isRetryable) {
          logger.warn("Qdrant operation failed, retrying...", {
            component: "QdrantClientService",
            retryCount: retryCount + 1,
            maxRetries: MAX_RETRIES,
            delayMs: delay,
            error: error.message,
          });

          await new Promise((resolve) => setTimeout(resolve, delay));
          return this.executeWithRetry(operation, retryCount + 1);
        }
      }

      return result;
    } catch (error) {
      if (retryCount < MAX_RETRIES) {
        const delay =
          RETRY_DELAYS[retryCount] || RETRY_DELAYS[RETRY_DELAYS.length - 1];

        logger.warn("Qdrant operation threw error, retrying...", {
          component: "QdrantClientService",
          retryCount: retryCount + 1,
          maxRetries: MAX_RETRIES,
          delayMs: delay,
          error: error instanceof Error ? error.message : String(error),
        });

        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.executeWithRetry(operation, retryCount + 1);
      }

      logger.error("Qdrant operation failed after retries", {
        component: "QdrantClientService",
        retryCount,
        error,
      });

      return err(
        ActionErrors.serviceUnavailable(
          "Qdrant operation failed after retries",
          "QdrantClientService.executeWithRetry"
        )
      );
    }
  }
}

