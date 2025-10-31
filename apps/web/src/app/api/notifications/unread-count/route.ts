import { type NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { NotificationService } from "@/server/services";
import { logger } from "@/lib/logger";

/**
 * GET /api/notifications/unread-count
 * Returns the unread notification count for the authenticated user
 * Used by React Query for real-time polling
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await getAuthSession();
    if (
      authResult.isErr() ||
      !authResult.value.isAuthenticated ||
      !authResult.value.user
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get unread count
    const result = await NotificationService.getUnreadCount();

    if (result.isErr()) {
      logger.error("Failed to get unread count", {
        component: "UnreadCountRoute",
        error: result.error,
      });

      return NextResponse.json(
        { error: "Failed to get unread count" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      count: result.value,
    });
  } catch (error) {
    logger.error("Error in unread count API", {
      component: "UnreadCountRoute",
      error,
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

