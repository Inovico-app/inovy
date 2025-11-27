"use server";

import { authorizedActionClient } from "@/lib/action-client";
import { policyToPermissions } from "@/lib/permission-helpers";
import { TaskService } from "@/server/services/task.service";
import { z } from "zod";

/**
 * Server action to get tags assigned to a specific task
 */
export const getTaskTags = authorizedActionClient
  .metadata({ permissions: policyToPermissions("tasks:read") })
  .schema(z.object({ taskId: z.string().uuid() }))
  .action(async ({ parsedInput }) => {
    const result = await TaskService.getTaskTags(parsedInput.taskId);
    
    if (result.isErr()) {
      throw new Error("Failed to fetch task tags");
    }
    
    return result.value;
  });

