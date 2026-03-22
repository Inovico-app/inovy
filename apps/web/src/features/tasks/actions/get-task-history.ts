"use server";

import type { AuthContext } from "@/lib/auth-context";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { TaskService } from "@/server/services/task.service";
import { z } from "zod";

/**
 * Server action to get task history
 * Returns audit trail of all changes made to a task
 */
export const getTaskHistory = authorizedActionClient
  .metadata({
    name: "get-task-history",
    permissions: policyToPermissions("tasks:read"),
    audit: { resourceType: "task", action: "read", category: "read" },
  })
  .schema(z.object({ taskId: z.string().uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    const auth: AuthContext = {
      user: ctx.user!,
      organizationId: ctx.organizationId!,
      userTeamIds: ctx.userTeamIds ?? [],
    };

    const result = await TaskService.getTaskHistory(parsedInput.taskId, auth);

    if (result.isErr()) {
      throw new Error(result.error.message);
    }

    return result.value;
  });
