"use server";

import { TaskService } from "@/server/services";
import type { TaskWithContextDto } from "@/server/dto";
import { logger } from "@/lib/logger";
import { filterTasksSchema, type FilterTasksInput } from "@/server/validation/tasks/filter-tasks";

/**
 * Server action to get tasks for the authenticated user
 * Returns tasks with context (project and recording information)
 * Supports filtering by priorities, statuses, projectIds, and search
 */
export async function getUserTasks(
  filters?: FilterTasksInput
): Promise<{
  success: boolean;
  data?: TaskWithContextDto[];
  error?: string;
}> {
  try {
    // Validate filters if provided
    if (filters) {
      const validation = filterTasksSchema.safeParse(filters);
      if (!validation.success) {
        return {
          success: false,
          error: "Invalid filter parameters",
        };
      }
    }

    const result = await TaskService.getTasksWithContext(filters);

    if (result.isErr()) {
      logger.error("Failed to get user tasks", {
        component: "getUserTasks",
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

