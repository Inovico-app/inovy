import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { DriveWatchesService } from "@/server/services/drive-watches.service";

/**
 * GET /api/integrations/google/drive/watch/list
 * List all active Drive watches for a user
 */
export async function GET(request: NextRequest) {
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

    // Get userId from query params (optional, defaults to authenticated user)
    const searchParams = request.nextUrl.searchParams;
    const requestedUserId = searchParams.get("userId");

    // Use requested userId if provided and user is admin, otherwise use authenticated user's ID
    const userId = requestedUserId && user.roles?.includes("admin")
      ? requestedUserId
      : user.id;

    // List watches
    const result = await DriveWatchesService.listWatches(userId);

    if (result.isErr()) {
      logger.error("Failed to list Drive watches", {
        component: "GET /api/integrations/google/drive/watch/list",
        userId: user.id,
        requestedUserId,
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
      watches: result.value,
    });
  } catch (error) {
    logger.error(
      "Error in list Drive watches API route",
      {},
      error as Error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

