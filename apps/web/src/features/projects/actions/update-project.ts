"use server";

import {
  authorizedActionClient,
  resultToActionResponse,
} from "../../../lib/action-client";
import { ActionErrors } from "../../../lib/action-errors";
import { getAuthSession } from "../../../lib/auth";
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
    const { user, session } = ctx;

    if (!user || !session) {
      throw ActionErrors.unauthenticated(
        "User or session not found",
        "update-project"
      );
    }

    // Get organization code from session
    const authResult = await getAuthSession();
    if (authResult.isErr() || !authResult.value.organization) {
      throw ActionErrors.internal(
        "Failed to get organization context",
        undefined,
        "update-project"
      );
    }

    const orgCode = authResult.value.organization.orgCode;

    // Update project
    const result = await ProjectService.updateProject(
      projectId,
      { name, description },
      orgCode
    );

    // Convert Result to action response (throws if error)
    return resultToActionResponse(result);
  });

