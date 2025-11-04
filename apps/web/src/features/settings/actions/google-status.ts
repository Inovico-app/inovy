"use server";

import { getUserSession } from "@/lib/auth";
import { logger } from "@/lib/logger";
import {
  getRecentAutoActions,
  getAutoActionStats,
  retryAutoAction,
} from "@/server/data-access/auto-actions.queries";
import type { AutoAction } from "@/server/db/schema";

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
    const userResult = await getUserSession();

    if (userResult.isErr() || !userResult.value) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }

    const user = userResult.value;

    const [actions, stats] = await Promise.all([
      getRecentAutoActions(user.id, "google", options),
      getAutoActionStats(user.id, "google"),
    ]);

    return {
      success: true,
      data: {
        actions,
        stats,
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
    const userResult = await getUserSession();

    if (userResult.isErr() || !userResult.value) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }

    const user = userResult.value;

    const action = await retryAutoAction(actionId, user.id);

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

