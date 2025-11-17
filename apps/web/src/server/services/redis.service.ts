import { logger } from "@/lib/logger";
import { Redis } from "@upstash/redis";

/**
 * Redis Service
 *
 * Singleton service for managing Upstash Redis connections and operations.
 * Provides caching functionality for embeddings and other data.
 */
export class RedisService {
  private static instance: RedisService | null = null;
  private client: Redis | null = null;

  private constructor() {
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!redisUrl || !redisToken) {
      logger.warn(
        "Redis environment variables not configured. Redis caching will be disabled.",
        {
          component: "RedisService",
          hasUrl: !!redisUrl,
          hasToken: !!redisToken,
        }
      );
      return;
    }

    try {
      this.client = new Redis({
        url: redisUrl,
        token: redisToken,
      });

      logger.info("RedisService initialized", {
        component: "RedisService",
        url: redisUrl,
      });
    } catch (error) {
      logger.error("Failed to initialize Redis client", {
        component: "RedisService",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get singleton instance of RedisService
   */
  static getInstance(): RedisService {
    RedisService.instance ??= new RedisService();
    return RedisService.instance;
  }

  /**
   * Check if Redis is available
   */
  isAvailable(): boolean {
    return this.client !== null;
  }

  /**
   * Get value from cache
   */
  async get(key: string): Promise<string | null> {
    if (!this.client) {
      return null;
    }

    try {
      const value = await this.client.get(key);
      return value as string | null;
    } catch (error) {
      logger.error("Redis get error", {
        component: "RedisService",
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Set value in cache with optional TTL (in seconds)
   */
  async set(key: string, value: string, ttl?: number): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      if (ttl) {
        await this.client.setex(key, ttl, value);
      } else {
        await this.client.set(key, value);
      }
      return true;
    } catch (error) {
      logger.error("Redis set error", {
        component: "RedisService",
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Delete key from cache
   */
  async del(key: string): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error("Redis del error", {
        component: "RedisService",
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error("Redis exists error", {
        component: "RedisService",
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Batch get multiple keys
   */
  async mget(keys: string[]): Promise<(string | null)[]> {
    if (!this.client || keys.length === 0) {
      return keys.map(() => null);
    }

    try {
      const values = await this.client.mget(...keys);
      return values.map((v) => (v as string | null) ?? null);
    } catch (error) {
      logger.error("Redis mget error", {
        component: "RedisService",
        keyCount: keys.length,
        error: error instanceof Error ? error.message : String(error),
      });
      return keys.map(() => null);
    }
  }

  /**
   * Batch set multiple key-value pairs with optional TTL
   */
  async mset(
    keyValuePairs: Array<{ key: string; value: string }>,
    ttl?: number
  ): Promise<boolean> {
    if (!this.client || keyValuePairs.length === 0) {
      return false;
    }

    try {
      // Upstash Redis REST API doesn't support pipeline, so we'll set sequentially
      // For better performance, we could use Promise.all but that might hit rate limits
      for (const { key, value } of keyValuePairs) {
        if (ttl) {
          await this.client.setex(key, ttl, value);
        } else {
          await this.client.set(key, value);
        }
      }
      return true;
    } catch (error) {
      logger.error("Redis mset error", {
        component: "RedisService",
        pairCount: keyValuePairs.length,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }
}

