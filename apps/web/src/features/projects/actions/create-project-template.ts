"use server";

import {
  authorizedActionClient,
  resultToActionResponse,
} from "../../../lib/action-client";
import { ActionErrors } from "../../../lib/action-errors";
import { getAuthSession } from "../../../lib/auth";
import { ProjectTemplateService } from "../../../server/services/project-template.service";
import { createProjectTemplateSchema } from "../../../server/validation/project-templates/create-project-template";
import { revalidatePath } from "next/cache";

/**
 * Create a new project template
 */
export const createProjectTemplateAction = authorizedActionClient
  .metadata({
    policy: "projects:update",
  })
  .inputSchema(createProjectTemplateSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { projectId, instructions } = parsedInput;
    const { user, session } = ctx;

    if (!user || !session) {
      throw ActionErrors.unauthenticated(
        "User or session not found",
        "create-project-template"
      );
    }

    // Get organization code from session
    const authResult = await getAuthSession();
    if (authResult.isErr() || !authResult.value.organization) {
      throw ActionErrors.internal(
        "Failed to get organization context",
        undefined,
        "create-project-template"
      );
    }

    const orgCode = authResult.value.organization.orgCode;

    // Create template using service
    const result = await ProjectTemplateService.createProjectTemplate(
      { projectId, instructions },
      user,
      orgCode
    );

    // Revalidate project page
    if (result.isOk()) {
      revalidatePath(`/projects/${projectId}`);
    }

    return resultToActionResponse(result);
  });

