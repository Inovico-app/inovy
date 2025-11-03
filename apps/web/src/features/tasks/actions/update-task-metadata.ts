"use server";

import { authorizedActionClient } from "@/lib/action-client";
import { ActionErrors } from "@/lib/action-errors";
import { TaskService } from "@/server/services";
import {
  updateTaskMetadataSchema,
  type UpdateTaskMetadataInput,
} from "@/server/validation/tasks/update-task-metadata";

/**
 * Server action to update task metadata
 * Allows editing task fields with full history tracking
 */
export const updateTaskMetadata = authorizedActionClient
  .metadata({ policy: "tasks:update" })
  .schema(updateTaskMetadataSchema)
  .action(async ({ parsedInput }: { parsedInput: UpdateTaskMetadataInput }) => {
    const result = await TaskService.updateTaskMetadata(parsedInput);
    
    if (result.isErr()) {
      throw new Error(result.error);
    }
    
    return result.value;
  });

