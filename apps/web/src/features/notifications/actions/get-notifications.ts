"use server";

import { getBetterAuthSession } from "@/lib/better-auth-session";
import { logger } from "@/lib/logger";
import type {
  NotificationFiltersDto,
  NotificationListDto,
} from "@/server/dto/notification.dto";
import { NotificationService } from "@/server/services/notification.service";

export async function getNotifications(
  filters?: NotificationFiltersDto
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

