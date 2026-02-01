import { getBetterAuthSession } from "@/lib/better-auth-session";
import { logger } from "@/lib/logger";
import { createSafeActionErrorResponse, createSafeErrorResponse } from "@/lib/safe-error-response";
import { Permissions } from "@/lib/rbac/permissions";
import { checkPermission } from "@/lib/rbac/permissions-server";
import { DriveWatchesService } from "@/server/services/drive-watches.service";
import { type NextRequest, NextResponse } from "next/server";

/**
 * GET /api/integrations/google/drive/watch/list
 * List all active Drive watches for a user
 */
export async function GET(request: NextRequest) {
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

    // Get userId from query params (optional, defaults to authenticated user)
    const searchParams = request.nextUrl.searchParams;
    const requestedUserId = searchParams.get("userId");

    // Use requested userId if provided and user has admin permissions, otherwise use authenticated user's ID
    let userId = user.id;
    if (requestedUserId) {
      const hasAdminPermission = await checkPermission(Permissions.admin.all);

      if (hasAdminPermission) {
        userId = requestedUserId;
      }
    }

    // List watches
    const result = await DriveWatchesService.listWatches(userId);

    if (result.isErr()) {
      return createSafeActionErrorResponse(
        result.error,
        "GET /api/integrations/google/drive/watch/list"
      );
    }

    return NextResponse.json({
      success: true,
      watches: result.value,
    });
  } catch (error) {
    return createSafeErrorResponse(
      error,
      "GET /api/integrations/google/drive/watch/list"
    );
  }
}

