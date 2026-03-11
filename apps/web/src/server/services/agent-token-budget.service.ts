import { logger } from "@/lib/logger";
import { createRedisClient } from "./redis-client.factory";

/**
 * Per-organization daily token budgets for AI agent usage.
 *
 * Tracks cumulative token consumption across all conversations within
 * a sliding 24-hour window. When the budget is exceeded the agent
 * returns a graceful error instead of making more LLM calls.
 *
 * Redis key: `token-budget:{orgId}` — stores cumulative token count
 * with a 24-hour TTL that auto-resets the budget daily.
 */

interface TokenBudgetConfig {
  /** Maximum tokens per organization per day */
  dailyLimit: number;
}

const DEFAULT_CONFIG: TokenBudgetConfig = {
  dailyLimit: Number(process.env.AGENT_DAILY_TOKEN_LIMIT) || 500_000,
};

const WINDOW_SECONDS = 86_400; // 24 hours

export class AgentTokenBudgetService {
  /**
   * Check if an organization has remaining token budget.
   * Returns the remaining token count (or -1 if Redis is unavailable).
   */
  static async getRemainingBudget(
    organizationId: string
  ): Promise<{ allowed: boolean; remaining: number; limit: number }> {
    const limit = DEFAULT_CONFIG.dailyLimit;

    try {
      const redis = await createRedisClient();
      if (!redis) {
        return { allowed: true, remaining: -1, limit }; // Fail open
      }

      const key = `token-budget:${organizationId}`;
      const currentStr = await redis.get(key);
      const current = currentStr ? Number(currentStr) : 0;
      const remaining = Math.max(0, limit - current);

      return {
        allowed: current < limit,
        remaining,
        limit,
      };
    } catch (error) {
      logger.error("Failed to check token budget — failing open", {
        component: "AgentTokenBudgetService",
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      return { allowed: true, remaining: -1, limit };
    }
  }

  /**
   * Record token usage for an organization.
   * Adds the token count to the sliding 24-hour window.
   */
  static async recordUsage(
    organizationId: string,
    tokenCount: number
  ): Promise<void> {
    if (tokenCount <= 0) return;

    try {
      const redis = await createRedisClient();
      if (!redis) return;

      const key = `token-budget:${organizationId}`;
      await redis.incrbyfloat(key, tokenCount);

      // Ensure the key has a TTL (set only if not already set)
      const ttl = await redis.exists(key);
      if (ttl) {
        // Set expiry on each increment to ensure auto-reset
        await redis.expire(key, WINDOW_SECONDS);
      }

      const currentStr = await redis.get(key);
      const current = currentStr ? Number(currentStr) : 0;

      if (current > DEFAULT_CONFIG.dailyLimit * 0.9) {
        logger.warn("Organization approaching daily token budget limit", {
          component: "AgentTokenBudgetService",
          organizationId,
          currentUsage: Math.round(current),
          limit: DEFAULT_CONFIG.dailyLimit,
          percentUsed: Math.round((current / DEFAULT_CONFIG.dailyLimit) * 100),
        });
      }
    } catch (error) {
      logger.error("Failed to record token usage", {
        component: "AgentTokenBudgetService",
        organizationId,
        tokenCount,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
