import { ActionErrors, type ActionResult } from "@/lib/action-errors";
import { logger } from "@/lib/logger";
import { EmbeddingCacheQueries } from "@/server/data-access/embedding-cache.queries";
import { connectionPool } from "@/server/services/connection-pool.service";
import { createHash } from "crypto";
import { err, ok } from "neverthrow";

export class EmbeddingService {
  private readonly EMBEDDING_MODEL = "text-embedding-3-large";
  private readonly BATCH_SIZE = 100; // embeddings per batch

  // Cache hit rate tracking (for monitoring) - shared across instances
  private static cacheHits = 0;
  private static cacheMisses = 0;

  /**
   * Generate SHA-256 hash of text content for cache key
   */
  private generateContentHash(text: string): string {
    return createHash("sha256").update(text).digest("hex");
  }

  /**
   * Get cache hit rate (for monitoring)
   */
  static getCacheHitRate(): number {
    const total = EmbeddingService.cacheHits + EmbeddingService.cacheMisses;
    if (total === 0) return 0;
    return EmbeddingService.cacheHits / total;
  }

  /**
   * Reset cache statistics
   */
  static resetCacheStats(): void {
    EmbeddingService.cacheHits = 0;
    EmbeddingService.cacheMisses = 0;
  }

  /**
   * Generate embedding for a single text with caching
   */
  async generateEmbedding(
    text: string,
    model: string = this.EMBEDDING_MODEL
  ): Promise<ActionResult<number[]>> {
    try {
      const contentHash = this.generateContentHash(text);

      // Check cache first
      try {
        const cached = await EmbeddingCacheQueries.getCachedEmbedding(
          contentHash,
          model
        );

        if (cached) {
          EmbeddingService.cacheHits++;
          logger.debug("Embedding cache hit", {
            component: "EmbeddingService",
            model,
            hash: contentHash.substring(0, 8),
          });
          return ok(cached);
        }
      } catch (cacheError) {
        // Cache lookup failed - log but continue with API call
        logger.warn("Cache lookup failed, proceeding with API call", {
          component: "EmbeddingService",
          error:
            cacheError instanceof Error
              ? cacheError.message
              : String(cacheError),
        });
      }

      EmbeddingService.cacheMisses++;

      // Generate embedding via API with retry logic and request tracking
      const response = await connectionPool.executeWithRetry(
        async () =>
          connectionPool.withRawOpenAIClient(async (openai) =>
            openai.embeddings.create({
              model,
              input: text,
            })
          ),
        "openai"
      );

      const embedding = response.data[0]?.embedding;

      if (!embedding) {
        return err(
          ActionErrors.internal(
            "Failed to generate embedding",
            undefined,
            "EmbeddingService.generateEmbedding"
          )
        );
      }

      // Cache asynchronously (non-blocking)
      EmbeddingCacheQueries.cacheEmbedding(contentHash, embedding, model).catch(
        (error) => {
          logger.warn("Failed to cache embedding", {
            component: "EmbeddingService",
            error: error instanceof Error ? error.message : String(error),
          });
        }
      );

      return ok(embedding);
    } catch (error) {
      logger.error("Error generating embedding", { error });
      return err(
        ActionErrors.internal(
          "Error generating embedding",
          error as Error,
          "EmbeddingService.generateEmbedding"
        )
      );
    }
  }

  /**
   * Generate embeddings for multiple texts in batch with caching
   */
  async generateEmbeddingsBatch(
    texts: string[],
    model: string = this.EMBEDDING_MODEL
  ): Promise<ActionResult<number[][]>> {
    try {
      if (texts.length === 0) {
        return ok([]);
      }

      // Generate hashes for all texts
      const contentHashes = texts.map((text) => this.generateContentHash(text));

      // Batch lookup from cache
      let cachedMap: Map<string, number[]> = new Map();
      try {
        cachedMap = await EmbeddingCacheQueries.getCachedEmbeddingsBatch(
          contentHashes,
          model
        );
      } catch (cacheError) {
        // Cache lookup failed - log but continue with API calls
        logger.warn("Batch cache lookup failed, proceeding with API calls", {
          component: "EmbeddingService",
          error:
            cacheError instanceof Error
              ? cacheError.message
              : String(cacheError),
        });
      }

      // Track cache hits/misses - count actual hits per input text, not unique cached entries
      const hits = contentHashes.reduce(
        (count, hash) => count + (hash && cachedMap.has(hash) ? 1 : 0),
        0
      );
      EmbeddingService.cacheHits += hits;
      EmbeddingService.cacheMisses += texts.length - hits;

      // Find texts that need embedding generation
      const uncachedIndices: number[] = [];
      const uncachedTexts: string[] = [];

      for (let i = 0; i < texts.length; i++) {
        if (!cachedMap.has(contentHashes[i] ?? "")) {
          uncachedIndices.push(i);
          uncachedTexts.push(texts[i] ?? "");
        }
      }

      // Generate embeddings for uncached texts with retry logic and request tracking
      let uncachedEmbeddings: number[][] = [];
      if (uncachedTexts.length > 0) {
        const response = await connectionPool.executeWithRetry(
          async () =>
            connectionPool.withRawOpenAIClient(async (openai) =>
              openai.embeddings.create({
                model,
                input: uncachedTexts,
              })
            ),
          "openai"
        );

        uncachedEmbeddings = response.data.map((item) => item.embedding);

        if (uncachedEmbeddings.length !== uncachedTexts.length) {
          return err(
            ActionErrors.internal(
              "Mismatch in embedding count",
              undefined,
              "EmbeddingService.generateEmbeddingsBatch"
            )
          );
        }

        // Cache new embeddings asynchronously (non-blocking)
        const cacheEntries = uncachedTexts.map((text, index) => ({
          hash: contentHashes[uncachedIndices[index] ?? 0] ?? "",
          embedding: uncachedEmbeddings[index] ?? [],
          model,
        }));

        EmbeddingCacheQueries.cacheEmbeddingsBatch(cacheEntries).catch(
          (error) => {
            logger.warn("Failed to cache batch embeddings", {
              component: "EmbeddingService",
              error: error instanceof Error ? error.message : String(error),
            });
          }
        );
      }

      // Combine cached and newly generated embeddings in correct order
      const allEmbeddings: number[][] = [];
      let uncachedIndex = 0;

      for (let i = 0; i < texts.length; i++) {
        const hash = contentHashes[i];
        if (hash && cachedMap.has(hash)) {
          allEmbeddings.push(cachedMap.get(hash) ?? []);
        } else {
          allEmbeddings.push(uncachedEmbeddings[uncachedIndex] ?? []);
          uncachedIndex++;
        }
      }

      logger.debug("Batch embedding generation completed", {
        component: "EmbeddingService",
        total: texts.length,
        cached: hits,
        generated: uncachedTexts.length,
        cacheHitRate: EmbeddingService.getCacheHitRate(),
      });

      return ok(allEmbeddings);
    } catch (error) {
      logger.error("Error generating embeddings batch", { error });
      return err(
        ActionErrors.internal(
          "Error generating embeddings batch",
          error as Error,
          "EmbeddingService.generateEmbeddingsBatch"
        )
      );
    }
  }
}

