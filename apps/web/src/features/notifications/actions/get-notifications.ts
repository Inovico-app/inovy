"use server";

import { getBetterAuthSession } from "@/lib/better-auth-session";
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
    // Verify authentication at action boundary
    const authResult = await getBetterAuthSession();
    if (authResult.isErr() || !authResult.value.isAuthenticated) {
      return { success: false, error: "Unauthorized" };
    }

    const result = await NotificationService.getNotifications(filters);

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

    const { user, organization } = authResult.value;
    if (user?.id && organization?.id) {
      void AuditLogService.createAuditLog({
        eventType: "notification_list",
        resourceType: "notification",
        resourceId: null,
        userId: user.id,
        organizationId: organization.id,
        action: "list",
        category: "read",
        metadata: { actionName: "getNotifications" },
      });
    }

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
