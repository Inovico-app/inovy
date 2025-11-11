"use server";

import {
  authorizedActionClient,
  resultToActionResponse,
} from "../../../lib/action-client";
import { ActionErrors } from "../../../lib/action-errors";
import { getAuthSession } from "../../../lib/auth";
import { ProjectTemplateService } from "../../../server/services/project-template.service";
import { updateProjectTemplateSchema } from "../../../server/validation/project-templates/update-project-template";
import { revalidatePath } from "next/cache";

/**
 * Update an existing project template
 */
export const updateProjectTemplateAction = authorizedActionClient
  .metadata({
    policy: "projects:update",
  })
  .inputSchema(updateProjectTemplateSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { id, instructions } = parsedInput;
    const { user, session } = ctx;

    if (!user || !session) {
      throw ActionErrors.unauthenticated(
        "User or session not found",
        "update-project-template"
      );
    }

    // Get organization code from session
    const authResult = await getAuthSession();
    if (authResult.isErr() || !authResult.value.organization) {
      throw ActionErrors.internal(
        "Failed to get organization context",
        undefined,
        "update-project-template"
      );
    }

    const orgCode = authResult.value.organization.orgCode;

    // Update template using service
    const result = await ProjectTemplateService.updateProjectTemplate(
      id,
      { instructions },
      orgCode
    );

    // Revalidate project page if template exists
    if (result.isOk()) {
      revalidatePath(`/projects/${result.value.projectId}`);
    }

    return resultToActionResponse(result);
  });

