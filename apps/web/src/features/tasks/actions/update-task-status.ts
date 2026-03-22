"use server";

import type { AuthContext } from "@/lib/auth-context";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import {
  authorizedActionClient,
  resultToActionResponse,
} from "@/lib/server-action-client/action-client";
import { TaskService } from "@/server/services/task.service";
import { updateTaskStatusSchema } from "@/server/validation/tasks/update-task-status";

/**
 * Server action to update a task's status
 * Supports transitions between pending, in_progress, completed, and cancelled
 */
export const updateTaskStatusAction = authorizedActionClient
  .metadata({
    name: "update-task-status",
    permissions: policyToPermissions("tasks:update"),
    audit: {
      resourceType: "task",
      action: "update-status",
      category: "mutation",
    },
  })
  .inputSchema(updateTaskStatusSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { taskId, status } = parsedInput;

    const auth: AuthContext = {
      user: ctx.user!,
      organizationId: ctx.organizationId!,
      userTeamIds: ctx.userTeamIds ?? [],
    };

    const result = await TaskService.updateTaskStatus(taskId, status, auth);
    return resultToActionResponse(result);
  });
