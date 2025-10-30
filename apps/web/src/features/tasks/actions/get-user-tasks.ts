"use server";

import { TaskService } from "@/server/services";
import type { TaskWithContextDto } from "@/server/dto";
import { logger } from "@/lib/logger";

/**
 * Server action to get tasks for the authenticated user
 * Returns tasks with context (project and recording information)
 */
export async function getUserTasks(): Promise<{
  success: boolean;
  data?: TaskWithContextDto[];
  error?: string;
}> {
  try {
    const result = await TaskService.getTasksWithContext();

    if (result.isErr()) {
      logger.error("Failed to get user tasks", {
        component: "getUserTasks",
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
    logger.error("Unexpected error getting user tasks", {
      component: "getUserTasks",
      error,
    });

    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

