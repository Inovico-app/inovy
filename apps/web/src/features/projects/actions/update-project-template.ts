"use server";

import { CacheInvalidation } from "@/lib/cache-utils";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import {
  authorizedActionClient,
  resultToActionResponse,
} from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { getUserOrganizationCode } from "@/lib/server-action-client/action-helpers";
import { ProjectTemplateService } from "@/server/services/project-template.service";
import { updateProjectTemplateSchema } from "@/server/validation/project-templates/update-project-template";

/**
 * Update an existing project template
 */
export const updateProjectTemplateAction = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("projects:update"),
  })
  .inputSchema(updateProjectTemplateSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { id, instructions } = parsedInput;
    const { user } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated(
        "User not found in context",
        "update-project-template"
      );
    }

    // Get user's organization code
    const orgCode = getUserOrganizationCode(user);

    // Update template using service
    const result = await ProjectTemplateService.updateProjectTemplate(
      id,
      { instructions },
      orgCode
    );

    // Revalidate project page if template exists
    if (result.isOk()) {
      CacheInvalidation.invalidateProjectTemplate(result.value.projectId);
    }

    return resultToActionResponse(result);
  });

