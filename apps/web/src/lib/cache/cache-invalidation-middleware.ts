import type { MiddlewareResult } from "next-safe-action";

import { invalidateCache } from "@/lib/cache-utils";
import { logger } from "@/lib/logger";
import type {
  ActionContext,
  Metadata,
} from "@/lib/server-action-client/action-client";

import { CACHE_POLICIES } from "./cache-policies";
import type { CachePolicy, InvalidationContext } from "./types";

/**
 * Cache invalidation middleware for server actions.
 *
 * Runs after the action body succeeds, resolves the applicable
 * {@link CachePolicy}, and calls `invalidateCache` with the resulting tags.
 *
 * Key behaviours:
 * - Only invalidates for mutations (`audit.category === "mutation"`)
 * - Respects `metadata.invalidate === false` (explicit opt-out)
 * - Respects `metadata.invalidate` function (explicit override)
 * - Falls back to `CACHE_POLICIES[resourceType:action]` when no override
 * - Wraps policy resolution in try/catch — logs errors, never throws
 * - Does NOT call `invalidateCache` when the action body throws
 */
export async function cacheInvalidationMiddleware({
  next,
  ctx,
  metadata,
}: {
  next: <NC extends object>(opts: {
    ctx: NC;
  }) => Promise<MiddlewareResult<string, NC>>;
  ctx: ActionContext;
  metadata: Metadata;
}) {
  // 1. Run the action body first. If it throws, the error propagates
  //    and none of the invalidation logic below executes.
  const result = await next({ ctx });

  // 2. After success, check if this is a mutation that needs invalidation
  const audit = metadata.audit;
  if (!audit || audit.category !== "mutation") {
    return result;
  }

  // 3. Check for explicit opt-out or override via metadata.invalidate
  //    The `invalidate` field may not exist on Metadata yet (added in Task 8),
  //    so access it safely.
  const invalidateOption = (
    metadata as Metadata & { invalidate?: CachePolicy | false }
  ).invalidate;

  if (invalidateOption === false) {
    return result;
  }

  // 4. Resolve the cache policy
  try {
    const policyKey = `${audit.resourceType}:${audit.action}`;

    let policy: CachePolicy | undefined;
    if (typeof invalidateOption === "function") {
      // Explicit override takes precedence over the registry
      policy = invalidateOption;
    } else {
      policy = CACHE_POLICIES[policyKey];
    }

    if (!policy) {
      logger.warn(`No cache policy found for mutation "${policyKey}"`, {
        component: "cache-invalidation-middleware",
        policyKey,
      });
      return result;
    }

    // 5. Build the InvalidationContext from ctx + parsedInput + result data
    const parsedInput = result.parsedInput;
    const input =
      typeof parsedInput === "object" && parsedInput !== null
        ? (parsedInput as Record<string, unknown>)
        : {};

    const invalidationCtx: InvalidationContext = {
      userId: ctx.user?.id ?? "",
      organizationId: ctx.organizationId ?? "",
      userTeamIds: ctx.userTeamIds ?? [],
      input,
      result: result.data,
    };

    // 6. Compute tags and invalidate
    const tags = policy(invalidationCtx);

    if (tags.length > 0) {
      invalidateCache(...tags);
    }
  } catch (error) {
    // Policy resolution or execution failed — log and swallow
    logger.error(
      "Cache invalidation failed — swallowing error to preserve action result",
      {
        component: "cache-invalidation-middleware",
        error: error instanceof Error ? error.message : String(error),
        actionName: metadata.name ?? "unknown",
      },
    );
  }

  return result;
}
