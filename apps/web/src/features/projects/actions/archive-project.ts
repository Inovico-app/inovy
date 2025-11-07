"use server";

import { authorizedActionClient } from "../../../lib/action-client";
import { ActionErrors } from "../../../lib/action-errors";
import { getAuthSession } from "../../../lib/auth";
import { ProjectService } from "../../../server/services";
import { archiveProjectSchema } from "../../../server/validation/projects/archive-project";

/**
 * Archive project action
 */
export const archiveProjectAction = authorizedActionClient
  .metadata({
    policy: "projects:delete",
  })
  .inputSchema(archiveProjectSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { projectId } = parsedInput;
    const { user, session } = ctx;

    if (!user || !session) {
      throw ActionErrors.unauthenticated(
        "User or session not found",
        "archive-project"
      );
    }

    // Get organization code from session
    const authResult = await getAuthSession();
    if (authResult.isErr() || !authResult.value.organization) {
      throw ActionErrors.internal(
        "Failed to get organization context",
        undefined,
        "archive-project"
      );
    }

    const orgCode = authResult.value.organization.orgCode;

    // Archive project
    const result = await ProjectService.archiveProject(projectId, orgCode);

    if (result.isErr()) {
      throw ActionErrors.internal(
        result.error.message,
        undefined,
        "archive-project"
      );
    }

    return { data: { success: result.value } };
  });

