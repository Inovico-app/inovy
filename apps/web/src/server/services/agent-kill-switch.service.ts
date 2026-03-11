import { logger } from "@/lib/logger";
import { createRedisClient } from "./redis-client.factory";

const REDIS_KEY = "agent:global-kill-switch";

/**
 * Global agent kill switch backed by an env var (static) and Redis (runtime).
 *
 * Check order:
 * 1. AGENT_GLOBAL_KILL_SWITCH env var — instant, no I/O
 * 2. Redis key "agent:global-kill-switch" — runtime-togglable by superadmins
 *
 * If either is active the agent is disabled for ALL organizations.
 * This is checked *before* the per-org AgentConfigService.isAgentEnabled().
 */
export class AgentKillSwitchService {
  /**
   * Returns true when the agent is globally killed.
   * Fails open (returns false) when Redis is unavailable so that the
   * per-org check still controls availability.
   */
  static async isKilled(): Promise<boolean> {
    // 1. Static env-var check (no I/O)
    if (process.env.AGENT_GLOBAL_KILL_SWITCH === "true") {
      logger.warn("Agent globally disabled via AGENT_GLOBAL_KILL_SWITCH env var", {
        component: "AgentKillSwitchService",
      });
      return true;
    }

    // 2. Runtime Redis check
    try {
      const redis = await createRedisClient();
      if (!redis) return false;

      const value = await redis.get(REDIS_KEY);
      if (value === "true" || value === 1) {
        logger.warn("Agent globally disabled via Redis kill switch", {
          component: "AgentKillSwitchService",
        });
        return true;
      }

      return false;
    } catch (error) {
      // Fail open — if Redis is down we defer to per-org config
      logger.error("Failed to check Redis kill switch — failing open", {
        component: "AgentKillSwitchService",
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Activate or deactivate the runtime kill switch.
   * The key has no expiry — it stays active until explicitly toggled off.
   */
  static async setKillSwitch(active: boolean): Promise<boolean> {
    try {
      const redis = await createRedisClient();
      if (!redis) {
        logger.error("Cannot set kill switch — Redis not available", {
          component: "AgentKillSwitchService",
        });
        return false;
      }

      await redis.set(REDIS_KEY, active ? "true" : "false");

      logger.security.suspiciousActivity(
        `Agent kill switch ${active ? "activated" : "deactivated"}`,
        { component: "AgentKillSwitchService" }
      );

      return true;
    } catch (error) {
      logger.error("Failed to set Redis kill switch", {
        component: "AgentKillSwitchService",
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }
}
