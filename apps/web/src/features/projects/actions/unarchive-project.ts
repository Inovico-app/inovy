"use server";

import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { authorizedActionClient } from "../../../lib/server-action-client/action-client";
import { ActionErrors } from "../../../lib/server-action-client/action-errors";
import { ProjectService } from "../../../server/services/project.service";
import { archiveProjectSchema } from "../../../server/validation/projects/archive-project";

/**
 * Unarchive project action (uses same schema as archive)
 */
export const unarchiveProjectAction = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("projects:update"),
  })
  .inputSchema(archiveProjectSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { projectId } = parsedInput;
    const { organizationId } = ctx;

    if (!organizationId) {
      throw ActionErrors.forbidden(
        "Organization context required",
        undefined,
        "unarchive-project"
      );
    }

    // Unarchive project
    const result = await ProjectService.unarchiveProject(
      projectId,
      organizationId
    );

    if (result.isErr()) {
      throw ActionErrors.internal(
        result.error.message,
        undefined,
        "unarchive-project"
      );
    }

    return { data: { success: result.value } };
  });

