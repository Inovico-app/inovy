"use server";

import {
  authorizedActionClient,
} from "../../../lib/action-client";
import { policyToPermissions } from "@/lib/permission-helpers";
import { ActionErrors } from "../../../lib/action-errors";
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
    const result = await ProjectService.unarchiveProject(projectId, organizationId);

    if (result.isErr()) {
      throw ActionErrors.internal(
        result.error.message,
        undefined,
        "unarchive-project"
      );
    }

    return { data: { success: result.value } };
  });

