"use server";

import { resolveAuthContext } from "@/lib/auth-context";
import { logger } from "@/lib/logger";
import { AuditLogService } from "@/server/services/audit-log.service";
import { NotificationService } from "@/server/services/notification.service";

export async function getUnreadCount(): Promise<{
  success: boolean;
  data?: { count: number };
  error?: string;
}> {
  try {
    const authResult = await resolveAuthContext("getUnreadCount");
    if (authResult.isErr()) {
      return { success: false, error: authResult.error.message };
    }

    const auth = authResult.value;

    const result = await NotificationService.getUnreadCount(auth);

    if (result.isErr()) {
      logger.error("Failed to get unread count", {
        component: "getUnreadCount",
        error: result.error.message,
      });

      return {
        success: false,
        error: result.error.message,
      };
    }

    void AuditLogService.createAuditLog({
      eventType: "notification_get",
      resourceType: "notification",
      resourceId: null,
      userId: auth.user.id,
      organizationId: auth.organizationId,
      action: "get",
      category: "read",
      metadata: { actionName: "getUnreadCount" },
    });

    return {
      success: true,
      data: { count: result.value },
    };
  } catch (error) {
    logger.error("Unexpected error getting unread count", {
      component: "getUnreadCount",
      error,
    });

    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}
