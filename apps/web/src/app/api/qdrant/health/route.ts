import { QdrantClientService } from "@/server/services/qdrant.service";
import { NextResponse } from "next/server";

/**
 * GET /api/qdrant/health
 * Health check endpoint for Qdrant connectivity
 * No authentication required (for monitoring purposes)
 */
export async function GET() {
  try {
    const qdrantService = QdrantClientService.getInstance();
    const healthResult = await qdrantService.healthCheck();

    if (healthResult.isErr()) {
      return NextResponse.json(
        {
          status: "unhealthy",
          service: "qdrant",
          error: healthResult.error.message,
        },
        { status: 503 }
      );
    }

    const { healthy, message } = healthResult.value;

    if (!healthy) {
      return NextResponse.json(
        {
          status: "unhealthy",
          service: "qdrant",
          message,
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      status: "healthy",
      service: "qdrant",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        service: "qdrant",
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 503 }
    );
  }
}

