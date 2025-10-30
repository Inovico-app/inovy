import { type Result, err, ok } from "neverthrow";
import { logger } from "../../lib/logger";
import redis from "../../lib/redis";

/**
 * Enterprise-level caching service for performance optimization
 * Provides type-safe caching with automatic serialization/deserialization
 */

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Cache tags for invalidation
}

export class CacheService {
  private static readonly DEFAULT_TTL = 900; // 15 minutes
  public static readonly KEY_PREFIX = "inovy:";

  /**
   * TTL configurations by data type
   */
  static readonly TTL = {
    PROJECT: 900, // 15 minutes - projects change moderately
    USER: 3600, // 1 hour - users change infrequently
    ORGANIZATION: 3600, // 1 hour - organizations change rarely
    SESSION: 1800, // 30 minutes - sessions need refresh
    TASK_LIST: 900, // 15 minutes - tasks change frequently
  } as const;

  /**
   * Cache key patterns for different entities
   * Note: organizationId and userId are now Kinde IDs (strings)
   */
  static readonly KEYS = {
    // Project keys
    PROJECT_BY_ID: (id: string) => `${CacheService.KEY_PREFIX}project:${id}`,
    PROJECT_BY_ORG: (orgCode: string, status?: string) =>
      `${CacheService.KEY_PREFIX}project:org:${orgCode}${
        status ? `:${status}` : ""
      }`,
    PROJECT_COUNT: (orgCode: string, status?: string) =>
      `${CacheService.KEY_PREFIX}project:count:${orgCode}${
        status ? `:${status}` : ""
      }`,

    // User keys (Kinde IDs)
    USER_BY_KINDE_ID: (kindeId: string) =>
      `${CacheService.KEY_PREFIX}user:kinde:${kindeId}`,
    USER_BY_ORG: (orgCode: string) =>
      `${CacheService.KEY_PREFIX}user:org:${orgCode}`,

    // Organization keys (Kinde organization codes)
    ORG_BY_CODE: (orgCode: string) =>
      `${CacheService.KEY_PREFIX}org:code:${orgCode}`,

    // Task keys (Kinde user ID and organization code)
    TASKS_BY_USER: (userId: string, orgCode: string) =>
      `${CacheService.KEY_PREFIX}tasks:user:${userId}:org:${orgCode}`,
  } as const;

  /**
   * Get value from cache with type safety
   */
  static async get<T>(key: string): Promise<Result<T | null, string>> {
    try {
      const cached = await redis.get(key);

      if (cached === null || cached === undefined) {
        logger.debug("Cache miss", { key });
        return ok(null);
      }

      // Handle different return types from Upstash Redis
      if (typeof cached === "string") {
        const parsed = JSON.parse(cached) as T;
        logger.debug("Cache hit", { key });
        return ok(parsed);
      }

      // If cached is already an object, return it directly
      logger.debug("Cache hit", { key });
      return ok(cached as T);
    } catch (error) {
      const errorMessage = "Failed to get from cache";
      logger.error(errorMessage, { key }, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Set value in cache with automatic serialization
   */
  static async set<T>(
    key: string,
    value: T,
    options: CacheOptions = {}
  ): Promise<Result<void, string>> {
    try {
      const ttl = options.ttl || CacheService.DEFAULT_TTL;
      const serialized = JSON.stringify(value);

      await redis.setex(key, ttl, serialized);

      logger.debug("Cache set", { key, ttl, tags: options.tags });
      return ok(undefined);
    } catch (error) {
      const errorMessage = "Failed to set cache";
      logger.error(errorMessage, { key }, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Delete single key from cache
   */
  static async delete(key: string): Promise<Result<void, string>> {
    try {
      await redis.del(key);
      logger.debug("Cache delete", { key });
      return ok(undefined);
    } catch (error) {
      const errorMessage = "Failed to delete from cache";
      logger.error(errorMessage, { key }, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  static async deletePattern(pattern: string): Promise<Result<number, string>> {
    try {
      // Get all keys matching pattern
      const keys = await redis.keys(pattern);

      if (keys.length === 0) {
        return ok(0);
      }

      // Delete all matching keys
      const deleted = await redis.del(...keys);

      logger.info("Cache pattern delete", { pattern, deleted });
      return ok(deleted);
    } catch (error) {
      const errorMessage = "Failed to delete cache pattern";
      logger.error(errorMessage, { pattern }, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Cache invalidation strategies
   */
  static readonly INVALIDATION = {
    /**
     * Invalidate all project-related cache for an organization
     */
    async invalidateProjectCache(organizationId: string): Promise<void> {
      await CacheService.deletePattern(
        `${CacheService.KEY_PREFIX}project:*${organizationId}*`
      );
    },

    /**
     * Invalidate specific project cache
     */
    async invalidateProject(
      projectId: string,
      organizationId: string
    ): Promise<void> {
      await Promise.all([
        CacheService.delete(CacheService.KEYS.PROJECT_BY_ID(projectId)),
        CacheService.deletePattern(
          `${CacheService.KEY_PREFIX}project:org:${organizationId}*`
        ),
        CacheService.deletePattern(
          `${CacheService.KEY_PREFIX}project:count:${organizationId}*`
        ),
      ]);
    },

    /**
     * Invalidate user-related cache (Kinde user ID)
     */
    async invalidateUser(kindeUserId: string, orgCode: string): Promise<void> {
      await Promise.all([
        CacheService.delete(CacheService.KEYS.USER_BY_KINDE_ID(kindeUserId)),
        CacheService.delete(CacheService.KEYS.USER_BY_ORG(orgCode)),
      ]);
    },

    /**
     * Invalidate organization-related cache (Kinde organization code)
     */
    async invalidateOrganization(orgCode: string): Promise<void> {
      await CacheService.delete(CacheService.KEYS.ORG_BY_CODE(orgCode));
    },

    /**
     * Invalidate all tasks for a user
     */
    async invalidateUserTasks(userId: string, orgCode: string): Promise<void> {
      await CacheService.deletePattern(
        `${CacheService.KEYS.TASKS_BY_USER(userId, orgCode)}:*`
      );
    },

    /**
     * Invalidate all tasks in an organization
     */
    async invalidateOrgTasks(orgCode: string): Promise<void> {
      await CacheService.deletePattern(
        `${CacheService.KEY_PREFIX}tasks:user:*:org:${orgCode}:*`
      );
    },
  };

  /**
   * Helper method to wrap database queries with caching
   */
  static async withCache<T>(
    cacheKey: string,
    queryFn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    // Try to get from cache first
    const cachedResult = await CacheService.get<T>(cacheKey);

    if (cachedResult.isOk() && cachedResult.value !== null) {
      return cachedResult.value;
    }

    // Cache miss - execute query
    const result = await queryFn();

    // Cache the result (fire and forget)
    CacheService.set(cacheKey, result, options).catch((error) => {
      logger.warn("Failed to cache result", { cacheKey, error });
    });

    return result;
  }

  /**
   * Health check for cache service
   */
  static async healthCheck(): Promise<
    Result<{ status: string; latency: number }, string>
  > {
    try {
      const start = Date.now();
      await redis.ping();
      const latency = Date.now() - start;

      return ok({
        status: "healthy",
        latency,
      });
    } catch (error) {
      const errorMessage = "Cache health check failed";
      logger.error(errorMessage, {}, error as Error);
      return err(errorMessage);
    }
  }
}

