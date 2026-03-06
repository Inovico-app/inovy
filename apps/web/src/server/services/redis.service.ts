import { logger } from "@/lib/logger";
import {
  createRedisClient,
  type RedisClient,
} from "./redis-client.factory";

/**
 * Redis Service
 *
 * Singleton service for managing Redis connections and operations.
 * Provides caching functionality for embeddings and other data.
 * Uses platform-aware client (Upstash for Vercel, ioredis for Azure).
 */
export class RedisService {
  private static instance: RedisService | null = null;
  private client: RedisClient | null = null;
  private initPromise: Promise<void> | null = null;

  private constructor() {}

  private init(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = (async () => {
        try {
          this.client = await createRedisClient();
          if (this.client) {
            logger.info("RedisService initialized", {
              component: "RedisService",
            });
          }
        } catch (error) {
          this.initPromise = null;
          logger.error("Failed to initialize Redis client", {
            component: "RedisService",
            error: error instanceof Error ? error.message : String(error),
          });
        }
      })();
    }
    return this.initPromise;
  }

  /**
   * Get singleton instance of RedisService
   */
  static getInstance(): RedisService {
    RedisService.instance ??= new RedisService();
    return RedisService.instance;
  }

  private async getClient(): Promise<RedisClient | null> {
    await this.init();
    return this.client;
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
    const client = await this.getClient();
    if (!client) return null;

    try {
      const value = await client.get(key);
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
    const client = await this.getClient();
    if (!client) return false;

    try {
      if (ttl) {
        await client.setex(key, ttl, value);
      } else {
        await client.set(key, value);
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
    const client = await this.getClient();
    if (!client) return false;

    try {
      await client.del(key);
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
    const client = await this.getClient();
    if (!client) return false;

    try {
      const result = await client.exists(key);
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
    const client = await this.getClient();
    if (!client || keys.length === 0) {
      return keys.map(() => null);
    }

    try {
      const values = await client.mget(...keys);
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
    const client = await this.getClient();
    if (!client || keyValuePairs.length === 0) {
      return false;
    }

    try {
      for (const { key, value } of keyValuePairs) {
        if (ttl) {
          await client.setex(key, ttl, value);
        } else {
          await client.set(key, value);
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
