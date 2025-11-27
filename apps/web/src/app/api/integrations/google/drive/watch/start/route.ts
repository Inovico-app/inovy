import { type NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { DriveWatchesService } from "@/server/services/drive-watches.service";
import { startDriveWatchSchema } from "@/server/validation/drive-watch";

/**
 * POST /api/integrations/google/drive/watch/start
 * Start watching a Google Drive folder
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const sessionResult = await getAuthSession();

    if (sessionResult.isErr() || !sessionResult.value.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = sessionResult.value;

    if (!session.user || !session.organization) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user, organization } = session;

    if (!organization.id) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

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

    const validationResult = startDriveWatchSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validationResult.error },
        { status: 400 }
      );
    }

    const { folderId, projectId } = validationResult.data;

    // Get webhook URL from environment
    const webhookUrl =
      process.env.NEXT_PUBLIC_WEBHOOK_URL ||
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/webhooks/google-drive`;

    // Start watch
    const result = await DriveWatchesService.startWatch(
      user.id,
      folderId,
      projectId,
      organization.id,
      webhookUrl
    );

    if (result.isErr()) {
      logger.error("Failed to start Drive watch", {
        component: "POST /api/integrations/google/drive/watch/start",
        userId: user.id,
        folderId,
        projectId,
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
      watch: result.value,
    });
  } catch (error) {
    logger.error(
      "Error in start Drive watch API route",
      {},
      error as Error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

