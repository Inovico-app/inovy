"use server";

import { getAuthSession } from "@/lib/auth";
import { logger } from "@/lib/logger";
import type { AutoAction } from "@/server/db/schema";
import { AutoActionsService } from "@/server/services/auto-actions.service";
/**
 * Get recent Google integration actions
 */
export async function getGoogleIntegrationStatus(options?: {
  limit?: number;
  type?: "calendar_event" | "email_draft";
}): Promise<{
  success: boolean;
  data?: {
    actions: Array<
      AutoAction & {
        recordingTitle?: string;
        taskTitle?: string;
      }
    >;
    stats: {
      total: number;
      completed: number;
      failed: number;
      pending: number;
      calendarEvents: number;
      emailDrafts: number;
    };
  };
  error?: string;
}> {
  try {
    const sessionResult = await getAuthSession();

    if (sessionResult.isErr() || !sessionResult.value.user) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }

    const user = sessionResult.value.user;

    const [actions, stats] = await Promise.all([
      AutoActionsService.getRecentAutoActions(user.id, "google", options),
      AutoActionsService.getAutoActionStats(user.id, "google"),
    ]);

    if (actions.isErr()) {
      logger.error("Failed to get recent auto actions", {
        userId: user.id,
        error: actions.error,
      });
    }

    if (stats.isErr()) {
      logger.error("Failed to get auto action stats", {
        userId: user.id,
        error: stats.error,
      });
    }

    return {
      success: true,
      data: {
        actions: actions.isOk() ? actions.value : [],
        stats: stats.isOk()
          ? stats.value
          : {
              total: 0,
              completed: 0,
              failed: 0,
              pending: 0,
              calendarEvents: 0,
              emailDrafts: 0,
            },
      },
    };
  } catch (error) {
    logger.error(
      "Unexpected error in getGoogleIntegrationStatus",
      {},
      error as Error
    );
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Retry a failed action
 */
export async function retryFailedAction(actionId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const sessionResult = await getAuthSession();

    if (sessionResult.isErr() || !sessionResult.value.user) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }

    const user = sessionResult.value.user;

    const action = await AutoActionsService.retryAutoAction(actionId, user.id);

    if (!action) {
      return {
        success: false,
        error: "Action not found or cannot be retried",
      };
    }

    logger.info("Retrying failed auto action", {
      userId: user.id,
      actionId,
    });

    return {
      success: true,
    };
  } catch (error) {
    logger.error("Unexpected error in retryFailedAction", {}, error as Error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

