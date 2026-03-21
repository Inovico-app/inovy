"use server";

import { getBetterAuthSession } from "@/lib/better-auth-session";
import { logger } from "@/lib/logger";
import { AuditLogService } from "@/server/services/audit-log.service";
import { NotificationService } from "@/server/services/notification.service";
import {
  markAsReadSchema,
  type MarkAsReadInput,
} from "@/server/validation/notifications/mark-as-read";
import type { NotificationDto } from "@/server/dto/notification.dto";

export async function markNotificationRead(input: MarkAsReadInput): Promise<{
  success: boolean;
  data?: NotificationDto;
  error?: string;
}> {
  try {
    // Verify authentication at action boundary
    const authResult = await getBetterAuthSession();
    if (authResult.isErr() || !authResult.value.isAuthenticated) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate input
    const validation = markAsReadSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues[0]?.message ?? "Invalid input",
      };
    }

    const { notificationId } = validation.data;

    // Mark as read
    const result = await NotificationService.markAsRead(notificationId);

    if (result.isErr()) {
      logger.error("Failed to mark notification as read", {
        component: "markNotificationRead",
        notificationId,
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
        resourceId: notificationId,
        userId: user.id,
        organizationId: organization.id,
        action: "mark_read",
        category: "mutation",
        metadata: { actionName: "markNotificationRead" },
      });
    }

    return {
      success: true,
      data: result.value,
    };
  } catch (error) {
    logger.error("Unexpected error marking notification as read", {
      component: "markNotificationRead",
      error,
    });

    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}
