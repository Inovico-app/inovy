import { logger } from "@/lib/logger";
import {
  createRedisClient,
  type RedisClient,
} from "./redis-client.factory";

/**
 * Rate Limiter Service
 *
 * Rate limiting to prevent abuse and manage costs
 * Uses token bucket algorithm for request-based limiting
 * Uses cost-based limiting for expensive operations (LLM tokens)
 * Uses platform-aware Redis client (Upstash for Vercel, ioredis for Azure).
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
  private client: RedisClient | null = null;
  private initPromise: Promise<void> | null = null;

  private constructor() {}

  private init(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = (async () => {
        try {
          this.client = await createRedisClient();
          if (this.client) {
            logger.info("RateLimiterService initialized", {
              component: "RateLimiterService",
            });
          }
        } catch (error) {
          this.initPromise = null;
          logger.error("Failed to initialize RateLimiterService", {
            component: "RateLimiterService",
            error: error instanceof Error ? error.message : String(error),
          });
        }
      })();
    }
    return this.initPromise;
  }

  /**
   * Get singleton instance of RateLimiterService
   */
  static getInstance(): RateLimiterService {
    RateLimiterService.instance ??= new RateLimiterService();
    return RateLimiterService.instance;
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
   * Get tier limits
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
   */
  async getUserTier(userId: string): Promise<UserTier> {
    const client = await this.getClient();
    if (!client) return "free";

    try {
      const tierKey = `tier:${userId}`;
      const tier = await client.get(tierKey);

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
    const client = await this.getClient();
    if (!client) {
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
      await client.zremrangebyscore(key, 0, windowStart);

      const currentCount = await client.zcard(key);

      if (currentCount >= maxRequests) {
        const oldestEntries = await client.zrange(key, 0, 0, {
          withScores: true,
        });

        let resetAt = now + windowSeconds * 1000;
        if (
          oldestEntries &&
          Array.isArray(oldestEntries) &&
          oldestEntries.length >= 2
        ) {
          const oldestTimestamp =
            typeof oldestEntries[1] === "number"
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

      const requestId = `${now}-${Math.random().toString(36).substring(7)}`;
      await client.zadd(key, { score: now, member: requestId });

      await client.expire(key, windowSeconds);

      const remaining = maxRequests - currentCount - 1;
      const resetAt = now + windowSeconds * 1000;

      return {
        allowed: true,
        remaining: Math.max(0, remaining),
        resetAt,
      };
    } catch (error) {
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
    const client = await this.getClient();
    if (!client) {
      logger.warn("Redis unavailable, allowing cost-based request", {
        component: "RateLimiterService",
        userId,
        cost,
      });
      return true;
    }

    const key = `costlimit:${userId}`;

    try {
      const currentCostStr = await client.get(key);
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

      await client.incrbyfloat(key, cost);

      await client.expire(key, windowSeconds);

      return true;
    } catch (error) {
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
