"use server";

import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import {
  authorizedActionClient,
  resultToActionResponse,
} from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { ProjectService } from "@/server/services/project.service";
import { updateProjectSchema } from "@/server/validation/projects/update-project";

/**
 * Project update using Result types throughout
 */
export const updateProjectAction = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("projects:update"),
    audit: {
      resourceType: "project",
      action: "update",
      category: "mutation",
    },
  })
  .inputSchema(updateProjectSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { projectId, name, description, teamId } = parsedInput;
    const { organizationId } = ctx;

    if (!organizationId) {
      throw ActionErrors.forbidden(
        "Organization context required",
        undefined,
        "update-project",
      );
    }

    // Update project
    const result = await ProjectService.updateProject(
      projectId,
      { name, description, teamId },
      organizationId,
    );

    if (result.isErr()) {
      throw result.error;
    }

    const project = result.value;

    // Enrich audit log via middleware
    ctx.audit?.setResourceId(projectId);
    ctx.audit?.setMetadata({
      projectName: project.name,
      updatedFields: { name, description, teamId },
    });

    // Convert Result to action response (throws if error)
    return resultToActionResponse(result);
  });
