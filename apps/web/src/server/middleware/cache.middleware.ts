import { CacheService } from "@/lib/cache";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "../../lib/logger";

/**
 * Cache middleware for API routes
 * Provides server-side caching for API responses
 */

interface CacheMiddlewareOptions {
  ttl?: number;
  cacheKeyPrefix?: string;
  skipCache?: boolean;
  methods?: string[];
}

export function withCache(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: CacheMiddlewareOptions = {}
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const {
      ttl = CacheService.TTL.PROJECT,
      cacheKeyPrefix = "api",
      skipCache = false,
      methods = ["GET"],
    } = options;

    // Only cache specified HTTP methods
    if (!methods.includes(req.method)) {
      return handler(req);
    }

    // Skip caching if requested
    if (skipCache) {
      return handler(req);
    }

    // Generate cache key from URL and query params
    const url = new URL(req.url);
    const cacheKey = `${CacheService.KEY_PREFIX}${cacheKeyPrefix}:${url.pathname}:${url.search}`;

    try {
      // Try to get cached response
      const cachedResult = await CacheService.get<{
        status: number;
        headers: Record<string, string>;
        body: string;
      }>(cacheKey);

      if (cachedResult.isOk() && cachedResult.value !== null) {
        const cached = cachedResult.value;
        logger.debug("API cache hit", { cacheKey, method: req.method });

        // Return cached response
        return new NextResponse(cached.body, {
          status: cached.status,
          headers: {
            ...cached.headers,
            "X-Cache": "HIT",
            "X-Cache-Key": cacheKey,
          },
        });
      }

      // Cache miss - execute handler
      const response = await handler(req);

      // Only cache successful responses
      if (response.status >= 200 && response.status < 300) {
        const responseClone = response.clone();
        const body = await responseClone.text();

        // Prepare cacheable response data
        const cacheData = {
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          body,
        };

        // Cache the response (fire and forget)
        CacheService.set(cacheKey, cacheData, { ttl }).catch((error) => {
          logger.warn("Failed to cache API response", { cacheKey, error });
        });

        // Add cache headers
        response.headers.set("X-Cache", "MISS");
        response.headers.set("X-Cache-Key", cacheKey);
      }

      return response;
    } catch (error) {
      logger.error("Cache middleware error", { cacheKey }, error as Error);
      // Fall back to handler on cache errors
      return handler(req);
    }
  };
}

/**
 * Cache invalidation middleware for write operations
 */
export function withCacheInvalidation(
  handler: (req: NextRequest) => Promise<NextResponse>,
  invalidationPatterns: string[]
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    // Execute the handler first
    const response = await handler(req);

    // Only invalidate cache for successful write operations
    if (
      response.status >= 200 &&
      response.status < 300 &&
      ["POST", "PUT", "PATCH", "DELETE"].includes(req.method)
    ) {
      // Invalidate cache patterns (fire and forget)
      Promise.all(
        invalidationPatterns.map((pattern) =>
          CacheService.deletePattern(pattern)
        )
      ).catch((error) => {
        logger.warn("Failed to invalidate cache", {
          patterns: invalidationPatterns,
          error,
        });
      });
    }

    return response;
  };
}

