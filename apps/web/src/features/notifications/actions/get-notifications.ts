"use server";

import { resolveAuthContext } from "@/lib/auth-context";
import { logger } from "@/lib/logger";
import type {
  NotificationFiltersDto,
  NotificationListDto,
} from "@/server/dto/notification.dto";
import { AuditLogService } from "@/server/services/audit-log.service";
import { NotificationService } from "@/server/services/notification.service";

export async function getNotifications(
  filters?: NotificationFiltersDto,
): Promise<{
  success: boolean;
  data?: NotificationListDto;
  error?: string;
}> {
  try {
    const authResult = await resolveAuthContext("getNotifications");
    if (authResult.isErr()) {
      return { success: false, error: authResult.error.message };
    }

    const auth = authResult.value;

    const result = await NotificationService.getNotifications(auth, filters);

    if (result.isErr()) {
      logger.error("Failed to get notifications", {
        component: "getNotifications",
        error: result.error.message,
      });

      return {
        success: false,
        error: result.error.message,
      };
    }

    void AuditLogService.createAuditLog({
      eventType: "notification_list",
      resourceType: "notification",
      resourceId: null,
      userId: auth.user.id,
      organizationId: auth.organizationId,
      action: "list",
      category: "read",
      metadata: { actionName: "getNotifications" },
    });

    return {
      success: true,
      data: result.value,
    };
  } catch (error) {
    logger.error("Unexpected error getting notifications", {
      component: "getNotifications",
      error,
    });

    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}
