import { logger } from "@/lib/logger";
import { Redis } from "@upstash/redis";

/**
 * Rate Limiter Service
 *
 * Rate limiting to prevent abuse and manage costs
 * Uses token bucket algorithm for request-based limiting
 * Uses cost-based limiting for expensive operations (LLM tokens)
 */

export type UserTier = "free" | "pro";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export interface TierLimits {
  maxRequests: number;
  maxCost: number;
}

export class RateLimiterService {
  private static instance: RateLimiterService | null = null;
  private client: Redis | null = null;

  private constructor() {
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!redisUrl || !redisToken) {
      logger.warn(
        "Redis environment variables not configured. Rate limiting will be disabled.",
        {
          component: "RateLimiterService",
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

      logger.info("RateLimiterService initialized", {
        component: "RateLimiterService",
      });
    } catch (error) {
      logger.error("Failed to initialize RateLimiterService", {
        component: "RateLimiterService",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get singleton instance of RateLimiterService
   */
  static getInstance(): RateLimiterService {
    RateLimiterService.instance ??= new RateLimiterService();
    return RateLimiterService.instance;
  }

  /**
   * Check if Redis is available
   */
  isAvailable(): boolean {
    return this.client !== null;
  }

  /**
   * Get tier limits
   * Defaults to free tier if tier is not specified
   */
  getTierLimits(tier: UserTier = "free"): TierLimits {
    const limits: Record<UserTier, TierLimits> = {
      free: {
        maxRequests:
          parseInt(process.env.RATE_LIMIT_FREE_MAX_REQUESTS || "100", 10) ||
          100,
        maxCost:
          parseInt(process.env.RATE_LIMIT_FREE_MAX_COST || "10000", 10) ||
          10000,
      },
      pro: {
        maxRequests:
          parseInt(process.env.RATE_LIMIT_PRO_MAX_REQUESTS || "1000", 10) ||
          1000,
        maxCost:
          parseInt(process.env.RATE_LIMIT_PRO_MAX_COST || "100000", 10) ||
          100000,
      },
    };

    return limits[tier];
  }

  /**
   * Get user tier
   * Defaults to 'free' if not specified
   * Can be extended to check user subscription in the future
   */
  async getUserTier(userId: string): Promise<UserTier> {
    if (!this.client) {
      return "free";
    }

    try {
      const tierKey = `tier:${userId}`;
      const tier = await this.client.get(tierKey);

      if (tier === "pro") {
        return "pro";
      }

      return "free";
    } catch (error) {
      logger.warn("Failed to get user tier, defaulting to free", {
        component: "RateLimiterService",
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      return "free";
    }
  }

  /**
   * Token bucket algorithm for request-based rate limiting
   */
  async checkLimit(
    userId: string,
    maxRequests: number = 100,
    windowSeconds: number = 3600
  ): Promise<RateLimitResult> {
    if (!this.client) {
      // Fail-open: allow requests if Redis is unavailable
      logger.warn("Redis unavailable, allowing request", {
        component: "RateLimiterService",
        userId,
      });
      return {
        allowed: true,
        remaining: maxRequests,
        resetAt: Date.now() + windowSeconds * 1000,
      };
    }

    const key = `ratelimit:${userId}`;
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    try {
      // Remove old entries outside the window
      await this.client.zremrangebyscore(key, 0, windowStart);

      // Count current requests in the window
      const currentCount = await this.client.zcard(key);

      if (currentCount >= maxRequests) {
        // Get the oldest entry to calculate reset time
        const oldestEntries = await this.client.zrange(key, 0, 0, {
          withScores: true,
        });

        let resetAt = now + windowSeconds * 1000;
        if (oldestEntries && Array.isArray(oldestEntries) && oldestEntries.length >= 2) {
          // Upstash returns [member, score] pairs when withScores is true
          const oldestTimestamp = typeof oldestEntries[1] === "number" 
            ? oldestEntries[1] 
            : parseInt(String(oldestEntries[1]), 10);
          resetAt = oldestTimestamp + windowSeconds * 1000;
        }

        logger.info("Rate limit exceeded", {
          component: "RateLimiterService",
          userId,
          currentCount,
          maxRequests,
          resetAt: new Date(resetAt).toISOString(),
        });

        return {
          allowed: false,
          remaining: 0,
          resetAt,
        };
      }

      // Add current request with timestamp as score
      const requestId = `${now}-${Math.random().toString(36).substring(7)}`;
      await this.client.zadd(key, { score: now, member: requestId });

      // Set expiration on the key
      await this.client.expire(key, windowSeconds);

      const remaining = maxRequests - currentCount - 1;
      const resetAt = now + windowSeconds * 1000;

      return {
        allowed: true,
        remaining: Math.max(0, remaining),
        resetAt,
      };
    } catch (error) {
      // Fail-open: allow requests on error
      logger.error("Rate limit check error, allowing request", {
        component: "RateLimiterService",
        userId,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        allowed: true,
        remaining: maxRequests,
        resetAt: now + windowSeconds * 1000,
      };
    }
  }

  /**
   * Cost-based rate limiting for expensive operations
   */
  async checkCostLimit(
    userId: string,
    cost: number,
    maxCost: number = 10000,
    windowSeconds: number = 3600
  ): Promise<boolean> {
    if (!this.client) {
      // Fail-open: allow requests if Redis is unavailable
      logger.warn("Redis unavailable, allowing cost-based request", {
        component: "RateLimiterService",
        userId,
        cost,
      });
      return true;
    }

    const key = `costlimit:${userId}`;

    try {
      // Get current cost
      const currentCostStr = await this.client.get(key);
      const currentCost = currentCostStr
        ? parseFloat(currentCostStr as string)
        : 0;

      if (currentCost + cost > maxCost) {
        logger.info("Cost limit exceeded", {
          component: "RateLimiterService",
          userId,
          currentCost,
          cost,
          maxCost,
        });

        return false;
      }

      // Increment cost
      await this.client.incrbyfloat(key, cost);

      // Set expiration on the key
      await this.client.expire(key, windowSeconds);

      return true;
    } catch (error) {
      // Fail-open: allow requests on error
      logger.error("Cost limit check error, allowing request", {
        component: "RateLimiterService",
        userId,
        cost,
        error: error instanceof Error ? error.message : String(error),
      });

      return true;
    }
  }
}

export const rateLimiter = RateLimiterService.getInstance();

