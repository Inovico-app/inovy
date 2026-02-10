import { getBetterAuthSession } from "@/lib/better-auth-session";
import { logger } from "@/lib/logger";
import { createSafeActionErrorResponse, createSafeErrorResponse } from "@/lib/safe-error-response";
import { DriveWatchesService } from "@/server/services/drive-watches.service";
import { startDriveWatchSchema } from "@/server/validation/drive-watch";
import { type NextRequest, NextResponse } from "next/server";

/**
 * POST /api/integrations/google/drive/watch/start
 * Start watching a Google Drive folder
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const sessionResult = await getBetterAuthSession();

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

    // Validate webhook URL is publicly accessible (not localhost in production)
    if (
      process.env.NODE_ENV === "production" &&
      (webhookUrl.includes("localhost") || webhookUrl.includes("127.0.0.1"))
    ) {
      logger.warn("Webhook URL uses localhost in production", {
        component: "POST /api/integrations/google/drive/watch/start",
        webhookUrl,
        userId: user.id,
      });
      return NextResponse.json(
        {
          error:
            "Webhook URL must be publicly accessible. Set NEXT_PUBLIC_WEBHOOK_URL environment variable to a public URL.",
        },
        { status: 400 }
      );
    }

    logger.info("Starting Drive watch with webhook URL", {
      component: "POST /api/integrations/google/drive/watch/start",
      userId: user.id,
      folderId,
      projectId,
      webhookUrl,
    });

    // Start watch
    const result = await DriveWatchesService.startWatch(
      user.id,
      folderId,
      projectId,
      organization.id,
      webhookUrl
    );

    if (result.isErr()) {
      return createSafeActionErrorResponse(
        result.error,
        "POST /api/integrations/google/drive/watch/start"
      );
    }

    logger.info("Successfully started Drive watch", {
      component: "POST /api/integrations/google/drive/watch/start",
      userId: user.id,
      folderId,
      projectId,
      watchId: result.value.id,
      webhookUrl,
      expiresAt: result.value.expiresAt,
      isActive: result.value.isActive,
    });

    return NextResponse.json({
      success: true,
      watch: result.value,
    });
  } catch (error) {
    return createSafeErrorResponse(
      error,
      "POST /api/integrations/google/drive/watch/start"
    );
  }
}

