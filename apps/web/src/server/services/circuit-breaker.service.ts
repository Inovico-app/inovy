import { logger } from "@/lib/logger";
import { createRedisClient, type RedisClient } from "./redis-client.factory";

/**
 * Circuit breaker states:
 * - CLOSED: normal operation, requests flow through
 * - OPEN: failures exceeded threshold, requests are rejected
 * - HALF_OPEN: after cooldown, allow one probe request to test recovery
 */
type CircuitState = "closed" | "open" | "half_open";

interface CircuitBreakerConfig {
  /** Number of failures within the window that triggers the circuit to open */
  failureThreshold: number;
  /** Time window in seconds for counting failures */
  failureWindowSeconds: number;
  /** How long the circuit stays open before moving to half-open (seconds) */
  cooldownSeconds: number;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  failureWindowSeconds: 60,
  cooldownSeconds: 30,
};

/**
 * Redis-backed circuit breaker for tool execution.
 *
 * Tracks failure rates per tool per organization. When a tool fails too often
 * the circuit opens and the tool returns a graceful error without executing,
 * preventing cascading failures and wasted resources.
 *
 * Redis keys:
 * - `cb:{orgId}:{toolName}:failures` — sorted set of failure timestamps
 * - `cb:{orgId}:{toolName}:state`    — current state (closed|open|half_open)
 * - `cb:{orgId}:{toolName}:opened`   — timestamp when circuit was opened
 */
export class CircuitBreakerService {
  private config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private keyPrefix(organizationId: string, toolName: string): string {
    return `cb:${organizationId}:${toolName}`;
  }

  /**
   * Check if a tool call is allowed. Returns false if the circuit is open.
   */
  async canExecute(organizationId: string, toolName: string): Promise<boolean> {
    const redis = await createRedisClient();
    if (!redis) return true; // Fail open if Redis unavailable

    try {
      const prefix = this.keyPrefix(organizationId, toolName);
      const state = await this.getState(redis, prefix);

      if (state === "closed") return true;

      if (state === "open") {
        // Check if cooldown has elapsed
        const openedAt = await redis.get(`${prefix}:opened`);
        if (openedAt) {
          const elapsed = (Date.now() - Number(openedAt)) / 1000;
          if (elapsed >= this.config.cooldownSeconds) {
            // Move to half-open
            await redis.set(`${prefix}:state`, "half_open");
            logger.info("Circuit breaker transitioning to half-open", {
              component: "CircuitBreaker",
              organizationId,
              toolName,
              elapsedSeconds: Math.round(elapsed),
            });
            return true; // Allow one probe request
          }
        }
        return false;
      }

      // half_open — allow the probe request
      return true;
    } catch (error) {
      logger.error("Circuit breaker canExecute failed — failing open", {
        component: "CircuitBreaker",
        organizationId,
        toolName,
        error: error instanceof Error ? error.message : String(error),
      });
      return true; // Fail open
    }
  }

  /**
   * Record a successful tool execution. Closes the circuit if it was half-open.
   */
  async recordSuccess(organizationId: string, toolName: string): Promise<void> {
    const redis = await createRedisClient();
    if (!redis) return;

    try {
      const prefix = this.keyPrefix(organizationId, toolName);
      const state = await this.getState(redis, prefix);

      if (state === "half_open") {
        await redis.set(`${prefix}:state`, "closed");
        await redis.del(`${prefix}:failures`);
        await redis.del(`${prefix}:opened`);

        logger.info("Circuit breaker closed after successful probe", {
          component: "CircuitBreaker",
          organizationId,
          toolName,
        });
      }
    } catch (error) {
      logger.error("Circuit breaker recordSuccess failed", {
        component: "CircuitBreaker",
        organizationId,
        toolName,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Record a failed tool execution. Opens the circuit if threshold is exceeded.
   */
  async recordFailure(organizationId: string, toolName: string): Promise<void> {
    const redis = await createRedisClient();
    if (!redis) return;

    try {
      const prefix = this.keyPrefix(organizationId, toolName);
      const state = await this.getState(redis, prefix);
      const now = Date.now();

      if (state === "half_open") {
        // Probe failed — re-open the circuit
        await redis.set(`${prefix}:state`, "open");
        await redis.set(`${prefix}:opened`, String(now));
        await redis.expire(`${prefix}:opened`, this.config.cooldownSeconds * 2);

        logger.warn("Circuit breaker re-opened after failed probe", {
          component: "CircuitBreaker",
          organizationId,
          toolName,
        });
        return;
      }

      // Record failure in sliding window — use unique member to prevent dedup
      const windowStart = now - this.config.failureWindowSeconds * 1000;
      const uniqueMember = `${now}:${crypto.randomUUID()}`;
      await redis.zremrangebyscore(`${prefix}:failures`, 0, windowStart);
      await redis.zadd(`${prefix}:failures`, { score: now, member: uniqueMember });
      await redis.expire(`${prefix}:failures`, this.config.failureWindowSeconds * 2);

      // Check failure count
      const failureCount = await redis.zcard(`${prefix}:failures`);

      if (failureCount >= this.config.failureThreshold) {
        await redis.set(`${prefix}:state`, "open");
        await redis.set(`${prefix}:opened`, String(now));
        await redis.expire(`${prefix}:state`, this.config.cooldownSeconds * 2);
        await redis.expire(`${prefix}:opened`, this.config.cooldownSeconds * 2);

        logger.warn("Circuit breaker opened — tool failures exceeded threshold", {
          component: "CircuitBreaker",
          organizationId,
          toolName,
          failureCount,
          threshold: this.config.failureThreshold,
          windowSeconds: this.config.failureWindowSeconds,
        });
      }
    } catch (error) {
      logger.error("Circuit breaker recordFailure failed", {
        component: "CircuitBreaker",
        organizationId,
        toolName,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get the current state of a circuit. Defaults to closed.
   */
  private async getState(
    redis: RedisClient,
    prefix: string
  ): Promise<CircuitState> {
    const state = await redis.get(`${prefix}:state`);
    if (state === "open" || state === "half_open") return state as CircuitState;
    return "closed";
  }
}

/** Shared singleton instance */
export const circuitBreaker = new CircuitBreakerService();
