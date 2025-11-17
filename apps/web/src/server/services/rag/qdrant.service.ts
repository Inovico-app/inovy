import { ActionErrors, type ActionResult } from "@/lib/action-errors";
import { logger } from "@/lib/logger";
import { QdrantClient } from "@qdrant/js-client-rest";
import { err, ok } from "neverthrow";

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
 * - HNSW index: m=16, ef_construct=100
 */
export interface QdrantPayload {
  userId: string;
  organizationId: string;
  departmentId?: string;
  teamId?: string[];
  projectId?: string;
  content: string;
  filename?: string;
  timestamp?: Date | string;
  [key: string]: unknown;
}

export interface QdrantPoint {
  id: string | number;
  vector: number[];
  payload?: QdrantPayload;
}

export interface QdrantSearchOptions {
  limit?: number;
  scoreThreshold?: number;
  filter?: {
    must?: Array<{
      key: string;
      match?: { value?: string | string[]; text?: string };
    }>;
  };
}

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
        logger.info("Creating Qdrant collection", {
          component: "QdrantClientService",
          collectionName: targetCollection,
        });

        await this.client.createCollection(targetCollection, {
          vectors: {
            size: 3072, // OpenAI text-embedding-3-large dimensions
            distance: "Cosine",
          },
          hnsw_config: {
            m: 16,
            ef_construct: 100,
          },
        });

        logger.info("Qdrant collection created", {
          component: "QdrantClientService",
          collectionName: targetCollection,
        });
      }

      // Create payload indices
      await this.createPayloadIndices(targetCollection);

      this.initializedCollections.add(targetCollection);
      return ok(undefined);
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
    const { collectionName: _, ...searchOptions } = options;

    // Ensure collection is initialized
    const initResult = await this.initialize(targetCollection);
    if (initResult.isErr()) {
      return err(initResult.error);
    }

    return await this.executeWithRetry(async () => {
      const searchResult = await this.client.search(targetCollection, {
        vector: queryVector,
        limit: searchOptions.limit ?? 10,
        score_threshold: searchOptions.scoreThreshold,
        filter: searchOptions.filter,
      });

      const results = searchResult.map((result) => ({
        id: result.id,
        score: result.score ?? 0,
        payload: result.payload as QdrantPayload | undefined,
      }));

      logger.debug("Searched Qdrant collection", {
        component: "QdrantClientService",
        collectionName: targetCollection,
        resultCount: results.length,
      });

      return ok(results);
    });
  }

  /**
   * Scroll points by filter (for keyword/full-text search)
   */
  async scroll(
    filter: {
      must?: Array<{
        key: string;
        match?: { value?: string | string[]; text?: string; any?: string[] };
      }>;
    },
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
        filter,
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
    filter: {
      must?: Array<{
        key: string;
        match?: { value: string | string[] };
      }>;
    },
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
        filter,
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
    filter: {
      must?: Array<{
        key: string;
        match?: { value: string | string[] };
      }>;
    },
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
        filter,
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

