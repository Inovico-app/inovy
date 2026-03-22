"use server";

import type { AuthContext } from "@/lib/auth-context";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import {
  authorizedActionClient,
  resultToActionResponse,
} from "@/lib/server-action-client/action-client";
import { TaskService } from "@/server/services/task.service";
import { filterTasksSchema } from "@/server/validation/tasks/filter-tasks";

/**
 * Server action to get tasks for the authenticated user
 * Returns tasks with context (project and recording information)
 * Supports filtering by priorities, statuses, projectIds, and search
 */
export const getUserTasksAction = authorizedActionClient
  .metadata({
    name: "get-user-tasks",
    permissions: policyToPermissions("tasks:read"),
    audit: {
      resourceType: "task",
      action: "list",
      category: "read",
    },
  })
  .inputSchema(filterTasksSchema.optional())
  .action(async ({ parsedInput, ctx }) => {
    const auth: AuthContext = {
      user: ctx.user!,
      organizationId: ctx.organizationId!,
      userTeamIds: ctx.userTeamIds ?? [],
    };

    const result = await TaskService.getTasksWithContext(auth, parsedInput);
    return resultToActionResponse(result);
  });
