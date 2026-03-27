import { logger } from "@/lib/logger";
import { db } from "@/server/db";
import {
  anthropicCircuitBreaker,
  openaiCircuitBreaker,
  deepgramCircuitBreaker,
} from "@/server/services/circuit-breaker.service";
import { connectionPool } from "@/server/services/connection-pool.service";
import { createRedisClient } from "@/server/services/redis-client.factory";
import { QdrantClientService } from "@/server/services/rag/qdrant.service";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

interface CheckResult {
  status: "up" | "down" | "ok" | "degraded";
  latencyMs?: number;
  error?: string;
  utilization?: number;
}

interface CircuitBreakerStates {
  anthropic: "closed" | "open" | "half_open";
  openai: "closed" | "open" | "half_open";
  deepgram: "closed" | "open" | "half_open";
}

interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  checks: {
    database: CheckResult;
    qdrant: CheckResult;
    redis: CheckResult;
    connectionPool: CheckResult;
  };
  circuitBreakers: CircuitBreakerStates;
}

async function checkDatabase(): Promise<CheckResult> {
  const start = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    return { status: "up", latencyMs: Date.now() - start };
  } catch (error) {
    logger.error("Health check: database error", {
      component: "health-route",
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      status: "down",
      latencyMs: Date.now() - start,
      error: "Database connection failed",
    };
  }
}

async function checkQdrant(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const qdrantService = QdrantClientService.getInstance();
    const healthResult = await qdrantService.healthCheck();
    const { healthy } = healthResult.unwrapOr({ healthy: false, message: "" });
    return {
      status: healthy ? "up" : "down",
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    logger.error("Health check: qdrant error", {
      component: "health-route",
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      status: "down",
      latencyMs: Date.now() - start,
      error: "Qdrant connection failed",
    };
  }
}

async function checkRedis(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const client = await createRedisClient();
    if (!client) {
      return {
        status: "down",
        latencyMs: Date.now() - start,
        error: "Redis not configured",
      };
    }
    await client.exists("health:ping");
    return { status: "up", latencyMs: Date.now() - start };
  } catch (error) {
    logger.error("Health check: redis error", {
      component: "health-route",
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      status: "down",
      latencyMs: Date.now() - start,
      error: "Redis connection failed",
    };
  }
}

function checkConnectionPool(): CheckResult {
  try {
    const metrics = connectionPool.getAllMetrics();
    const totalClients =
      metrics.openai.totalClients + metrics.anthropic.totalClients;
    const utilization =
      totalClients > 0
        ? Math.round(
            ((metrics.openai.activeConnections +
              metrics.anthropic.activeConnections) /
              (totalClients * 10)) *
              100,
          ) / 100
        : 0;

    const isOk = totalClients > 0;
    return {
      status: isOk ? "ok" : "degraded",
      utilization,
    };
  } catch (error) {
    logger.error("Health check: connection pool error", {
      component: "health-route",
      error: error instanceof Error ? error.message : String(error),
    });
    return { status: "degraded", error: "Connection pool check failed" };
  }
}

/**
 * GET /api/health
 * Consolidated health check endpoint for monitoring.
 * No authentication required — intended for uptime monitors and load balancers.
 *
 * Returns 200 if all services are healthy, 503 if any critical service is down.
 *
 * ISO 27001:2022 A.8.16 — Monitoring activities
 */
export async function GET(): Promise<NextResponse<HealthResponse>> {
  const [database, qdrant, redis] = await Promise.all([
    checkDatabase(),
    checkQdrant(),
    checkRedis(),
  ]);

  const connectionPoolCheck = checkConnectionPool();

  const circuitBreakers: CircuitBreakerStates = {
    anthropic: anthropicCircuitBreaker.getState(),
    openai: openaiCircuitBreaker.getState(),
    deepgram: deepgramCircuitBreaker.getState(),
  };

  const criticalDown =
    database.status === "down" ||
    qdrant.status === "down" ||
    redis.status === "down";
  const anyDegraded = connectionPoolCheck.status === "degraded";
  const anyCircuitOpen = Object.values(circuitBreakers).some(
    (state) => state === "open",
  );

  const overallStatus = criticalDown
    ? "unhealthy"
    : anyDegraded || anyCircuitOpen
      ? "degraded"
      : "healthy";

  const httpStatus = criticalDown ? 503 : 200;

  const body: HealthResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION ?? "dev",
    checks: {
      database,
      qdrant,
      redis,
      connectionPool: connectionPoolCheck,
    },
    circuitBreakers,
  };

  return NextResponse.json(body, { status: httpStatus });
}
