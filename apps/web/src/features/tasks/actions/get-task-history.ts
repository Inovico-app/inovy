"use server";

import { authorizedActionClient } from "@/lib/action-client";
import { TaskService } from "@/server/services/task.service";
import { z } from "zod";

/**
 * Server action to get task history
 * Returns audit trail of all changes made to a task
 */
export const getTaskHistory = authorizedActionClient
  .metadata({ policy: "tasks:read" })
  .schema(z.object({ taskId: z.string().uuid() }))
  .action(async ({ parsedInput }) => {
    const result = await TaskService.getTaskHistory(parsedInput.taskId);
    
    if (result.isErr()) {
      throw new Error(result.error.message);
    }
    
    return result.value;
  });

