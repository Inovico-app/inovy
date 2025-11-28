"use server";

import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { TaskService } from "@/server/services/task.service";
import {
  updateTaskMetadataSchema,
  type UpdateTaskMetadataInput,
} from "@/server/validation/tasks/update-task-metadata";

/**
 * Server action to update task metadata
 * Allows editing task fields with full history tracking
 */
export const updateTaskMetadata = authorizedActionClient
  .metadata({ permissions: policyToPermissions("tasks:update") })
  .schema(updateTaskMetadataSchema)
  .action(async ({ parsedInput }: { parsedInput: UpdateTaskMetadataInput }) => {
    const result = await TaskService.updateTaskMetadata(parsedInput);

    if (result.isErr()) {
      throw new Error(result.error.message);
    }

    return result.value;
  });

