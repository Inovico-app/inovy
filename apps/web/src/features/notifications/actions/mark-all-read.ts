"use server";

import { logger } from "@/lib/logger";
import { NotificationService } from "@/server/services/notification.service";

export async function markAllNotificationsRead(): Promise<{
  success: boolean;
  data?: { count: number };
  error?: string;
}> {
  try {
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

