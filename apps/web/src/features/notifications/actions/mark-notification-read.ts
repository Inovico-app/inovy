"use server";

import { logger } from "@/lib/logger";
import { NotificationService } from "@/server/services";
import {
  markAsReadSchema,
  type MarkAsReadInput,
} from "@/server/validation/notifications/mark-as-read";
import type { NotificationDto } from "@/server/dto";

export async function markNotificationRead(
  input: MarkAsReadInput
): Promise<{
  success: boolean;
  data?: NotificationDto;
  error?: string;
}> {
  try {
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

