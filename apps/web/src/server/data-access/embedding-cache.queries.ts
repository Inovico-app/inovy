import { db } from "@/server/db";
import {
  embeddingCache,
  type NewEmbeddingCache,
} from "@/server/db/schema/embedding-cache";
import { and, eq, inArray, lt, sql } from "drizzle-orm";

/**
 * Model dimension mapping
 */
const MODEL_DIMENSIONS: Record<string, number> = {
  "text-embedding-3-small": 1536,
  "text-embedding-3-large": 3072,
} as const;

/**
 * Get the expected dimension for a model
 */
function getModelDimension(model: string): number {
  return MODEL_DIMENSIONS[model] ?? 3072; // Default to max dimension
}

/**
 * Pad or truncate embedding to target dimension
 */
function normalizeEmbedding(
  embedding: number[],
  targetDimension: number
): number[] {
  if (embedding.length === targetDimension) {
    return embedding;
  }
  if (embedding.length < targetDimension) {
    // Pad with zeros
    return [
      ...embedding,
      ...new Array(targetDimension - embedding.length).fill(0),
    ];
  }
  // Truncate
  return embedding.slice(0, targetDimension);
}

export class EmbeddingCacheQueries {
  /**
   * Get cached embedding by content hash and model
   */
  static async getCachedEmbedding(
    contentHash: string,
    model: string
  ): Promise<number[] | null> {
    const result = await db
      .select()
      .from(embeddingCache)
      .where(
        and(
          eq(embeddingCache.contentHash, contentHash),
          eq(embeddingCache.model, model)
        )
      )
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const cached = result[0];
    const embedding = cached.embedding as number[];

    // Check TTL (30 days)
    const createdAt = cached.createdAt;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    if (createdAt < thirtyDaysAgo) {
      // Expired - delete and return null
      await db.delete(embeddingCache).where(eq(embeddingCache.id, cached.id));
      return null;
    }

    // Normalize embedding to expected dimension for the model
    const expectedDimension = getModelDimension(model);
    return normalizeEmbedding(embedding, expectedDimension);
  }

  /**
   * Batch get cached embeddings
   * Returns a map of contentHash -> embedding for cached items
   */
  static async getCachedEmbeddingsBatch(
    contentHashes: string[],
    model: string
  ): Promise<Map<string, number[]>> {
    if (contentHashes.length === 0) {
      return new Map();
    }

    const results = await db
      .select()
      .from(embeddingCache)
      .where(
        and(
          inArray(embeddingCache.contentHash, contentHashes),
          eq(embeddingCache.model, model)
        )
      );

    const cachedMap = new Map<string, number[]>();
    const expiredIds: string[] = [];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const expectedDimension = getModelDimension(model);

    for (const cached of results) {
      // Check TTL
      if (cached.createdAt < thirtyDaysAgo) {
        expiredIds.push(cached.id);
        continue;
      }

      const embedding = cached.embedding as number[];
      // Normalize embedding to expected dimension
      const normalized = normalizeEmbedding(embedding, expectedDimension);
      cachedMap.set(cached.contentHash, normalized);
    }

    // Delete expired entries
    if (expiredIds.length > 0) {
      await db
        .delete(embeddingCache)
        .where(inArray(embeddingCache.id, expiredIds));
    }

    return cachedMap;
  }

  /**
   * Cache a single embedding
   */
  static async cacheEmbedding(
    contentHash: string,
    embedding: number[],
    model: string
  ): Promise<void> {
    // Normalize to 3072 dimensions for storage
    const normalizedEmbedding = normalizeEmbedding(embedding, 3072);

    const cacheEntry: NewEmbeddingCache = {
      contentHash,
      embedding: normalizedEmbedding,
      model,
    };

    // Use INSERT ... ON CONFLICT DO NOTHING to handle race conditions
    await db.insert(embeddingCache).values(cacheEntry).onConflictDoNothing();
  }

  /**
   * Batch cache embeddings
   */
  static async cacheEmbeddingsBatch(
    entries: Array<{ hash: string; embedding: number[]; model: string }>
  ): Promise<void> {
    if (entries.length === 0) {
      return;
    }

    const cacheEntries: NewEmbeddingCache[] = entries.map((entry) => ({
      contentHash: entry.hash,
      embedding: normalizeEmbedding(entry.embedding, 3072),
      model: entry.model,
    }));

    // Insert in batches to avoid query size limits
    const BATCH_SIZE = 100;
    for (let i = 0; i < cacheEntries.length; i += BATCH_SIZE) {
      const batch = cacheEntries.slice(i, i + BATCH_SIZE);
      await db.insert(embeddingCache).values(batch).onConflictDoNothing();
    }
  }

  /**
   * Delete expired embeddings (older than 30 days)
   */
  static async deleteExpiredEmbeddings(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await db
      .delete(embeddingCache)
      .where(lt(embeddingCache.createdAt, thirtyDaysAgo))
      .returning({ id: embeddingCache.id });

    return result.length;
  }

  /**
   * Invalidate all cache entries
   */
  static async invalidateCache(): Promise<number> {
    const result = await db
      .delete(embeddingCache)
      .returning({ id: embeddingCache.id });

    return result.length;
  }

  /**
   * Invalidate cache entries for a specific model
   */
  static async invalidateCacheByModel(model: string): Promise<number> {
    const result = await db
      .delete(embeddingCache)
      .where(eq(embeddingCache.model, model))
      .returning({ id: embeddingCache.id });

    return result.length;
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats(): Promise<{
    totalEntries: number;
    entriesByModel: Record<string, number>;
    expiredEntries: number;
  }> {
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(embeddingCache);

    const modelResults = await db
      .select({
        model: embeddingCache.model,
        count: sql<number>`count(*)`,
      })
      .from(embeddingCache)
      .groupBy(embeddingCache.model);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [expiredResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(embeddingCache)
      .where(lt(embeddingCache.createdAt, thirtyDaysAgo));

    const entriesByModel: Record<string, number> = {};
    for (const row of modelResults) {
      entriesByModel[row.model] = Number(row.count);
    }

    return {
      totalEntries: Number(totalResult.count),
      entriesByModel,
      expiredEntries: Number(expiredResult.count),
    };
  }
}

