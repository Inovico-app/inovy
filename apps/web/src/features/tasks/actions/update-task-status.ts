"use server";

import { logger } from "@/lib/logger";
import { TaskService } from "@/server/services/task.service";
import type { TaskDto } from "@/server/dto/task.dto";
import {
  updateTaskStatusSchema,
  type UpdateTaskStatusInput,
} from "@/server/validation/tasks/update-task-status";

export async function updateTaskStatus(
  input: UpdateTaskStatusInput
): Promise<{
  success: boolean;
  data?: TaskDto;
  error?: string;
}> {
  try {
    // Validate input
    const validation = updateTaskStatusSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues[0]?.message ?? "Invalid input",
      };
    }

    const { taskId, status } = validation.data;

    // Update task status with authorization
    const result = await TaskService.updateTaskStatus(taskId, status);

    if (result.isErr()) {
      logger.error("Failed to update task status", {
        component: "updateTaskStatus",
        taskId,
        status,
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
    logger.error("Unexpected error updating task status", {
      component: "updateTaskStatus",
      error,
    });

    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

