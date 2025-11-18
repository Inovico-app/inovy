import { logger } from "@/lib/logger";
import {
  rateLimiter,
  type UserTier,
} from "@/server/services/rate-limiter.service";
import { type NextRequest, NextResponse } from "next/server";

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

/**
 * Extract user ID from request
 * This function attempts to get the user ID from the authenticated session
 */
async function extractUserId(request: NextRequest): Promise<string | null> {
  try {
    const { getAuthSession } = await import("@/lib/auth");
    const sessionResult = await getAuthSession();

    if (sessionResult.isOk() && sessionResult.value.isAuthenticated) {
      return sessionResult.value.user?.id ?? null;
    }

    return null;
  } catch (error) {
    logger.warn("Failed to extract user ID for rate limiting", {
      component: "rate-limit",
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Handler function type for API routes
 */
type ApiRouteHandler = (
  request: NextRequest,
  context?: any
) => Promise<Response | NextResponse>;

/**
 * Wrapper function to add rate limiting to API route handlers
 *
 * @example
 * ```typescript
 * export const POST = withRateLimit(
 *   async (request: NextRequest) => {
 *     // Your handler code
 *     return NextResponse.json({ success: true });
 *   },
 *   {
 *     maxRequests: 100,
 *     windowSeconds: 3600,
 *   }
 * );
 * ```
 *
 * @example With custom user ID extraction
 * ```typescript
 * export const POST = withRateLimit(
 *   async (request: NextRequest) => {
 *     const user = await getUser();
 *     // Your handler code
 *     return NextResponse.json({ success: true });
 *   },
 *   {
 *     maxRequests: 100,
 *     windowSeconds: 3600,
 *   },
 *   async (request) => {
 *     const user = await getUser();
 *     return user?.id ?? null;
 *   }
 * );
 * ```
 */
export function withRateLimit(
  handler: ApiRouteHandler,
  options: RateLimitOptions = {},
  getUserId?: (request: NextRequest) => Promise<string | null>
): ApiRouteHandler {
  return async (request: NextRequest, context?: any) => {
    // Extract user ID
    const userId = getUserId
      ? await getUserId(request)
      : await extractUserId(request);

    // If no user ID, allow the request (handler should handle auth)
    if (!userId) {
      return handler(request, context);
    }

    // Check rate limit
    const rateLimitResult = await checkRateLimit(userId, options);

    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult);
    }

    // Call the original handler
    const response = await handler(request, context);

    // Add rate limit headers to the response
    // Handle both NextResponse and regular Response
    if (response instanceof NextResponse) {
      return addRateLimitHeaders(response, rateLimitResult);
    }

    // For streaming responses or regular Response objects
    if (response instanceof Response) {
      const headers = new Headers(response.headers);
      headers.set("X-RateLimit-Limit", rateLimitResult.limit.toString());
      headers.set("X-RateLimit-Remaining", rateLimitResult.remaining.toString());
      headers.set(
        "X-RateLimit-Reset",
        new Date(rateLimitResult.resetAt).toISOString()
      );

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }

    return response;
  };
}

