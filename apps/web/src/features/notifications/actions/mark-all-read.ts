"use server";

import { resolveAuthContext } from "@/lib/auth-context";
import { logger } from "@/lib/logger";
import { AuditLogService } from "@/server/services/audit-log.service";
import { NotificationService } from "@/server/services/notification.service";

export async function markAllNotificationsRead(): Promise<{
  success: boolean;
  data?: { count: number };
  error?: string;
}> {
  try {
    const authResult = await resolveAuthContext("markAllNotificationsRead");
    if (authResult.isErr()) {
      return { success: false, error: authResult.error.message };
    }

    const auth = authResult.value;

    const result = await NotificationService.markAllAsRead(auth);

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

    void AuditLogService.createAuditLog({
      eventType: "notification_mark_read",
      resourceType: "notification",
      resourceId: null,
      userId: auth.user.id,
      organizationId: auth.organizationId,
      action: "mark_read",
      category: "mutation",
      metadata: { actionName: "markAllNotificationsRead" },
    });

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
