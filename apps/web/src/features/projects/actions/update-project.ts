"use server";

import {
  authorizedActionClient,
  resultToActionResponse,
} from "../../../lib/action-client";
import { ActionErrors } from "../../../lib/action-errors";
import { ProjectService } from "../../../server/services";
import { updateProjectSchema } from "../../../server/validation/projects/update-project";

/**
 * Project update using Result types throughout
 */
export const updateProjectAction = authorizedActionClient
  .metadata({
    policy: "projects:update",
  })
  .inputSchema(updateProjectSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { projectId, name, description } = parsedInput;
    const { organizationId } = ctx;

    if (!organizationId) {
      throw ActionErrors.forbidden(
        "Organization context required",
        undefined,
        "update-project"
      );
    }

    // Update project
    const result = await ProjectService.updateProject(
      projectId,
      { name, description },
      organizationId
    );

    // Convert Result to action response (throws if error)
    return resultToActionResponse(result);
  });

