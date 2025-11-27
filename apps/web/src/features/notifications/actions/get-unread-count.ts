"use server";

import { logger } from "@/lib/logger";
import { NotificationService } from "@/server/services/notification.service";

export async function getUnreadCount(): Promise<{
  success: boolean;
  data?: { count: number };
  error?: string;
}> {
  try {
    const result = await NotificationService.getUnreadCount();

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

