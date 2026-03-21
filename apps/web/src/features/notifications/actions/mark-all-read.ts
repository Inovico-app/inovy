"use server";

import { getBetterAuthSession } from "@/lib/better-auth-session";
import { logger } from "@/lib/logger";
import { AuditLogService } from "@/server/services/audit-log.service";
import { NotificationService } from "@/server/services/notification.service";

export async function markAllNotificationsRead(): Promise<{
  success: boolean;
  data?: { count: number };
  error?: string;
}> {
  try {
    // Verify authentication at action boundary
    const authResult = await getBetterAuthSession();
    if (authResult.isErr() || !authResult.value.isAuthenticated) {
      return { success: false, error: "Unauthorized" };
    }

    const result = await NotificationService.markAllAsRead();

    if (result.isErr()) {
      logger.error("Failed to mark all notifications as read", {
        component: "markAllNotificationsRead",
        error: result.error.message,
      });

      return {
        success: false,
        error: result.error.message,
      };
    }

    const { user, organization } = authResult.value;
    if (user?.id && organization?.id) {
      void AuditLogService.createAuditLog({
        eventType: "notification_mark_read",
        resourceType: "notification",
        resourceId: null,
        userId: user.id,
        organizationId: organization.id,
        action: "mark_read",
        category: "mutation",
        metadata: { actionName: "markAllNotificationsRead" },
      });
    }

    return {
      success: true,
      data: { count: result.value },
    };
  } catch (error) {
    logger.error("Unexpected error marking all notifications as read", {
      component: "markAllNotificationsRead",
      error,
    });

    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}
