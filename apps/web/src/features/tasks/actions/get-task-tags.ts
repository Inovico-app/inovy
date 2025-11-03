"use server";

import { authorizedActionClient } from "@/lib/action-client";
import { TaskTagsQueries } from "@/server/data-access";
import { z } from "zod";

/**
 * Server action to get tags assigned to a specific task
 */
export const getTaskTags = authorizedActionClient
  .metadata({ policy: "tasks:read" })
  .schema(z.object({ taskId: z.string().uuid() }))
  .action(async ({ parsedInput }) => {
    const result = await TaskTagsQueries.getTaskTags(parsedInput.taskId);
    
    if (result.isErr()) {
      throw new Error("Failed to fetch task tags");
    }
    
    return result.value;
  });

