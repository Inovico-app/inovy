import { invalidateCache } from "../cache-utils";
import { logger } from "../logger";
import { CACHE_POLICIES } from "./cache-policies";
import type { InvalidationContext } from "./types";

/**
 * Escape hatch for invalidating cache outside the action middleware chain.
 * Used by services called from workflows/webhooks (not actions).
 */
export function invalidateFor(
  resourceType: string,
  action: string,
  ctx: Partial<InvalidationContext>,
): void {
  const key = `${resourceType}:${action}`;
  const policy = CACHE_POLICIES[key];

  if (!policy) {
    logger.warn(`[cache] No policy found for "${key}"`, {
      component: "invalidateFor",
    });
    return;
  }

  const fullCtx: InvalidationContext = {
    userId: ctx.userId ?? "",
    organizationId: ctx.organizationId ?? "",
    userTeamIds: ctx.userTeamIds ?? [],
    input: ctx.input ?? {},
    result: ctx.result ?? undefined,
  };

  try {
    const tags = policy(fullCtx);

    if (tags.length === 0 && process.env.NODE_ENV === "development") {
      logger.warn(
        `[cache] Policy "${key}" resolved zero tags — required context fields may be missing`,
        { component: "invalidateFor", ctx: fullCtx },
      );
    }

    if (tags.length > 0) {
      invalidateCache(...tags);
    }
  } catch (error) {
    logger.error(`[cache] Policy "${key}" threw an error`, {
      component: "invalidateFor",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
