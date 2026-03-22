import { resolveAuthContext } from "@/lib/auth-context";
import { logger } from "@/lib/logger";
import { NotificationService } from "@/server/services/notification.service";
import { NextResponse } from "next/server";

/**
 * GET /api/notifications/unread-count
 * Returns the unread notification count for the authenticated user
 * Used by React Query for real-time polling
 */
export async function GET() {
  try {
    const authResult = await resolveAuthContext("UnreadCountRoute");
    if (authResult.isErr()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const auth = authResult.value;

    // Get unread count
    const result = await NotificationService.getUnreadCount(auth);

    if (result.isErr()) {
      logger.error("Failed to get unread count", {
        component: "UnreadCountRoute",
        error: result.error,
      });

      return NextResponse.json(
        { error: "Failed to get unread count" },
        { status: 500 },
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
      { status: 500 },
    );
  }
}
