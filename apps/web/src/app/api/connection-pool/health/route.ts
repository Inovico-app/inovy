import { logger } from "@/lib/logger";
import {
  anthropicCircuitBreaker,
  openaiCircuitBreaker,
} from "@/server/services/circuit-breaker.service";
import { connectionPool } from "@/server/services/connection-pool.service";
import { NextResponse } from "next/server";

/**
 * Health check endpoint for connection pool metrics
 *
 * Returns pool status including:
 * - Active connections
 * - Pool utilization
 * - Total clients per provider
 *
 * Note: Provider-level health is tracked by the circuit breaker service,
 * not the connection pool.
 */
export async function GET() {
  try {
    const metrics = connectionPool.getAllMetrics();

    // Determine overall health status based on pool availability
    const isHealthy =
      metrics.openai.totalClients > 0 && metrics.anthropic.totalClients > 0;
    const isDegraded =
      metrics.openai.totalClients > 0 || metrics.anthropic.totalClients > 0;

    const status = isHealthy ? "ok" : isDegraded ? "degraded" : "unhealthy";
    const httpStatus = isHealthy ? 200 : isDegraded ? 503 : 503;

    const circuitBreakers = {
      anthropic: anthropicCircuitBreaker.getState(),
      openai: openaiCircuitBreaker.getState(),
    };

    return NextResponse.json(
      {
        status,
        timestamp: new Date().toISOString(),
        pools: {
          openai: {
            ...metrics.openai,
            status:
              metrics.openai.totalClients > 0 ? "available" : "unavailable",
          },
          anthropic: {
            ...metrics.anthropic,
            status:
              metrics.anthropic.totalClients > 0 ? "available" : "unavailable",
          },
        },
        circuitBreakers,
      },
      { status: httpStatus },
    );
  } catch (error) {
    // Log full error server-side instead of returning it verbatim
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error(
      "Connection pool health check error",
      {
        component: "connection-pool-health",
      },
      err,
    );

    return NextResponse.json(
      {
        status: "error",
        error: "Internal error checking connection pool",
      },
      { status: 500 },
    );
  }
}
