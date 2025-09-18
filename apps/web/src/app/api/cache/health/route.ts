import { NextResponse } from "next/server";
import { CacheHealthService } from "../../../../server/services/cache-health.service";

/**
 * Cache health check API endpoint
 * GET /api/cache/health
 */
export async function GET() {
  try {
    const healthResult = await CacheHealthService.getHealthStatus();

    if (healthResult.isErr()) {
      return NextResponse.json({ error: healthResult.error }, { status: 500 });
    }

    const health = healthResult.value;

    return NextResponse.json({
      cache: health,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to check cache health" },
      { status: 500 }
    );
  }
}

