import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { DriveWatchesService } from "@/server/services/drive-watches.service";
import { stopDriveWatchSchema } from "@/server/validation/drive-watch";

/**
 * POST /api/integrations/google/drive/watch/stop
 * Stop watching a Google Drive folder
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const sessionResult = await getAuthSession();

    if (sessionResult.isErr() || !sessionResult.value.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = sessionResult.value;

    if (!session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user } = session;

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    const validationResult = stopDriveWatchSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validationResult.error },
        { status: 400 }
      );
    }

    const { folderId } = validationResult.data;

    // Stop watch
    const result = await DriveWatchesService.stopWatch(user.id, folderId);

    if (result.isErr()) {
      logger.error("Failed to stop Drive watch", {
        component: "POST /api/integrations/google/drive/watch/stop",
        userId: user.id,
        folderId,
        error: result.error,
      });

      // Map error code to HTTP status
      const statusMap: Record<string, number> = {
        UNAUTHENTICATED: 401,
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        BAD_REQUEST: 400,
        CONFLICT: 409,
        VALIDATION_ERROR: 400,
        RATE_LIMITED: 429,
        SERVICE_UNAVAILABLE: 503,
        INTERNAL_SERVER_ERROR: 500,
      };

      return NextResponse.json(
        {
          error: result.error.message,
          code: result.error.code,
        },
        { status: statusMap[result.error.code] ?? 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Watch stopped successfully",
    });
  } catch (error) {
    logger.error(
      "Error in stop Drive watch API route",
      {},
      error as Error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

