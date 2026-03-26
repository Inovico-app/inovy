"use server";

import type { AuthContext } from "@/lib/auth-context";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { ProjectService } from "@/server/services/project.service";
import { archiveProjectSchema } from "@/server/validation/projects/archive-project";

/**
 * Archive project action
 */
export const archiveProjectAction = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("projects:delete"),
    audit: {
      resourceType: "project",
      action: "archive",
      category: "mutation",
    },
  })
  .inputSchema(archiveProjectSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { projectId } = parsedInput;
    const { organizationId } = ctx;

    if (!organizationId || !ctx.user) {
      throw ActionErrors.forbidden(
        "Organization context required",
        undefined,
        "archive-project",
      );
    }

    const auth: AuthContext = {
      user: ctx.user,
      organizationId,
      userTeamIds: ctx.userTeamIds ?? [],
    };

    // Archive project
    const result = await ProjectService.archiveProject(projectId, auth);

    if (result.isErr()) {
      throw ActionErrors.internal(
        result.error.message,
        undefined,
        "archive-project",
      );
    }

    // Enrich audit log via middleware
    ctx.audit?.setResourceId(projectId);

    return { data: { success: result.value } };
  });
