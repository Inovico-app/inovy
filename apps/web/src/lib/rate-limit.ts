import { logger } from "@/lib/logger";
import {
  rateLimiter,
  type UserTier,
} from "@/server/services/rate-limiter.service";
import { NextResponse } from "next/server";

/**
 * Rate limit options for API routes
 */
export interface RateLimitOptions {
  /**
   * Maximum requests per window (defaults to tier-based limit)
   */
  maxRequests?: number;
  /**
   * Time window in seconds (default: 3600 = 1 hour)
   */
  windowSeconds?: number;
  /**
   * Cost for cost-based limiting (optional)
   */
  cost?: number;
  /**
   * Maximum cost per window (defaults to tier-based limit)
   */
  maxCost?: number;
  /**
   * Override user tier (optional)
   */
  tier?: UserTier;
}

/**
 * Rate limit check result
 */
export interface RateLimitCheckResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
  retryAfter?: number;
}

/**
 * Check rate limit for a user
 */
export async function checkRateLimit(
  userId: string,
  options: RateLimitOptions = {}
): Promise<RateLimitCheckResult> {
  const {
    maxRequests,
    windowSeconds = 3600,
    cost,
    maxCost,
    tier,
  } = options;

  // Get user tier if not provided
  const userTier = tier ?? (await rateLimiter.getUserTier(userId));

  // Get tier limits
  const tierLimits = rateLimiter.getTierLimits(userTier);

  // Use provided limits or tier defaults
  const effectiveMaxRequests = maxRequests ?? tierLimits.maxRequests;
  const effectiveMaxCost = maxCost ?? tierLimits.maxCost;

  // Check request-based limit
  const limitResult = await rateLimiter.checkLimit(
    userId,
    effectiveMaxRequests,
    windowSeconds
  );

  // If cost-based limiting is enabled, check cost limit
  if (cost !== undefined && cost > 0) {
    const costAllowed = await rateLimiter.checkCostLimit(
      userId,
      cost,
      effectiveMaxCost,
      windowSeconds
    );

    if (!costAllowed) {
      logger.info("Cost limit exceeded", {
        component: "rate-limit",
        userId,
        cost,
        maxCost: effectiveMaxCost,
      });

      return {
        allowed: false,
        remaining: limitResult.remaining,
        resetAt: limitResult.resetAt,
        limit: effectiveMaxRequests,
        retryAfter: Math.ceil((limitResult.resetAt - Date.now()) / 1000),
      };
    }
  }

  const retryAfter = limitResult.allowed
    ? undefined
    : Math.ceil((limitResult.resetAt - Date.now()) / 1000);

  return {
    allowed: limitResult.allowed,
    remaining: limitResult.remaining,
    resetAt: limitResult.resetAt,
    limit: effectiveMaxRequests,
    retryAfter,
  };
}

/**
 * Create a rate-limited NextResponse
 */
export function createRateLimitResponse(
  result: RateLimitCheckResult
): NextResponse {
  const headers = new Headers();
  headers.set("X-RateLimit-Limit", result.limit.toString());
  headers.set("X-RateLimit-Remaining", result.remaining.toString());
  headers.set(
    "X-RateLimit-Reset",
    new Date(result.resetAt).toISOString()
  );

  if (result.retryAfter !== undefined) {
    headers.set("Retry-After", result.retryAfter.toString());
  }

  return NextResponse.json(
    {
      error: "Rate limit exceeded",
      message: "Too many requests. Please try again later.",
      retryAfter: result.retryAfter,
    },
    {
      status: 429,
      headers,
    }
  );
}

/**
 * Add rate limit headers to an existing response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  result: RateLimitCheckResult
): NextResponse {
  const headers = new Headers(response.headers);
  headers.set("X-RateLimit-Limit", result.limit.toString());
  headers.set("X-RateLimit-Remaining", result.remaining.toString());
  headers.set(
    "X-RateLimit-Reset",
    new Date(result.resetAt).toISOString()
  );

  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

