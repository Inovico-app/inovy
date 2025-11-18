import { logger } from "@/lib/logger";
import { connectionPool } from "@/server/services/connection-pool.service";
import { NextResponse } from "next/server";

/**
 * Health check endpoint for connection pool metrics
 *
 * Returns pool status including:
 * - Active connections
 * - Pool utilization
 * - Health status per client
 */
export async function GET() {
  try {
    const metrics = connectionPool.getAllMetrics();

    // Determine overall health status
    const isHealthy =
      metrics.openai.healthyClients > 0 &&
      metrics.anthropic.healthyClients > 0;
    const isDegraded =
      metrics.openai.healthyClients > 0 ||
      metrics.anthropic.healthyClients > 0;

    const status = isHealthy ? "ok" : isDegraded ? "degraded" : "unhealthy";
    const httpStatus = isHealthy ? 200 : isDegraded ? 503 : 503;

    return NextResponse.json(
      {
        status,
        timestamp: new Date().toISOString(),
        pools: {
          openai: {
            ...metrics.openai,
            status: metrics.openai.healthyClients > 0 ? "healthy" : "unhealthy",
          },
          anthropic: {
            ...metrics.anthropic,
            status:
              metrics.anthropic.healthyClients > 0 ? "healthy" : "unhealthy",
          },
        },
      },
      { status: httpStatus }
    );
  } catch (error) {
    // Log full error server-side instead of returning it verbatim
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error("Connection pool health check error", {
      component: "connection-pool-health",
    }, err);

    return NextResponse.json(
      {
        status: "error",
        error: "Internal error checking connection pool",
      },
      { status: 500 }
    );
  }
}

