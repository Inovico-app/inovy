"use server";

import {
  authorizedActionClient,
} from "../../../lib/action-client";
import { ActionErrors } from "../../../lib/action-errors";
import { getAuthSession } from "../../../lib/auth";
import { ProjectService } from "../../../server/services";
import { archiveProjectSchema } from "../../../server/validation/projects/archive-project";

/**
 * Unarchive project action (uses same schema as archive)
 */
export const unarchiveProjectAction = authorizedActionClient
  .metadata({
    policy: "projects:update",
  })
  .inputSchema(archiveProjectSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { projectId } = parsedInput;
    const { user, session } = ctx;

    if (!user || !session) {
      throw ActionErrors.unauthenticated(
        "User or session not found",
        "unarchive-project"
      );
    }

    // Get organization code from session
    const authResult = await getAuthSession();
    if (authResult.isErr() || !authResult.value.organization) {
      throw ActionErrors.internal(
        "Failed to get organization context",
        undefined,
        "unarchive-project"
      );
    }

    const orgCode = authResult.value.organization.orgCode;

    // Unarchive project
    const result = await ProjectService.unarchiveProject(projectId, orgCode);

    if (result.isErr()) {
      throw ActionErrors.internal(
        result.error,
        undefined,
        "unarchive-project"
      );
    }

    return { data: { success: result.value } };
  });

