"use server";

import { logger } from "@/lib/logger";
import { NotificationService } from "@/server/services";
import type {
  NotificationListDto,
  NotificationFiltersDto,
} from "@/server/dto";

export async function getNotifications(
  filters?: NotificationFiltersDto
): Promise<{
  success: boolean;
  data?: NotificationListDto;
  error?: string;
}> {
  try {
    const result = await NotificationService.getNotifications(filters);

    if (result.isErr()) {
      logger.error("Failed to get notifications", {
        component: "getNotifications",
        error: result.error,
      });

      return {
        success: false,
        error: result.error,
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

