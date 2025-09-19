import { Result, err, ok } from "neverthrow";
import { logger } from "../../lib/logger";
import { CacheService } from "./cache.service";

/**
 * Service for cache health monitoring and management
 */

export interface CacheHealthStatus {
  status: "healthy" | "unhealthy" | "degraded";
  latency: number;
  hitRate?: number;
  memoryUsage?: number;
  errors: string[];
}

export class CacheHealthService {
  /**
   * Comprehensive cache health check
   */
  static async getHealthStatus(): Promise<Result<CacheHealthStatus, string>> {
    try {
      const errors: string[] = [];
      let status: "healthy" | "unhealthy" | "degraded" = "healthy";

      // Basic connectivity test
      const healthResult = await CacheService.healthCheck();

      if (healthResult.isErr()) {
        errors.push(healthResult.error);
        status = "unhealthy";
        return ok({
          status,
          latency: -1,
          errors,
        });
      }

      const { latency } = healthResult.value;

      // Check latency thresholds
      if (latency > 100) {
        errors.push(`High latency: ${latency}ms`);
        status = status === "healthy" ? "degraded" : status;
      }

      if (latency > 500) {
        status = "unhealthy";
      }

      return ok({
        status,
        latency,
        errors,
      });
    } catch (error) {
      const errorMessage = "Failed to get cache health status";
      logger.error(errorMessage, {}, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Clear all cache (use with caution)
   */
  static async clearAllCache(): Promise<Result<number, string>> {
    try {
      const result = await CacheService.deletePattern("inovy:*");

      if (result.isOk()) {
        logger.info("Cache cleared", { deletedKeys: result.value });
      }

      return result;
    } catch (error) {
      const errorMessage = "Failed to clear cache";
      logger.error(errorMessage, {}, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Warm up cache with frequently accessed data
   */
  static async warmUpCache(): Promise<Result<void, string>> {
    try {
      // This would typically pre-populate cache with commonly accessed data
      // For now, just log the intention
      logger.info("Cache warm-up initiated", {
        strategy: "lazy-loading", // We use lazy loading for now
      });

      return ok(undefined);
    } catch (error) {
      const errorMessage = "Failed to warm up cache";
      logger.error(errorMessage, {}, error as Error);
      return err(errorMessage);
    }
  }
}

