import { getBetterAuthSession } from "@/lib/better-auth-session";
import { createSafeActionErrorResponse, createSafeErrorResponse } from "@/lib/safe-error-response";
import { DriveWatchesService } from "@/server/services/drive-watches.service";
import { stopDriveWatchSchema } from "@/server/validation/drive-watch";
import { type NextRequest, NextResponse } from "next/server";

/**
 * POST /api/integrations/google/drive/watch/stop
 * Stop watching a Google Drive folder
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const sessionResult = await getBetterAuthSession();

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
      return createSafeActionErrorResponse(
        result.error,
        "POST /api/integrations/google/drive/watch/stop"
      );
    }

    return NextResponse.json({
      success: true,
      message: "Watch stopped successfully",
    });
  } catch (error) {
    return createSafeErrorResponse(
      error,
      "POST /api/integrations/google/drive/watch/stop"
    );
  }
}

