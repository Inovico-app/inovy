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

    return NextResponse.json(
      {
        status: "ok",
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
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}

