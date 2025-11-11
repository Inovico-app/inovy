"use server";

import { ActionErrors } from "@/lib/action-errors";
import { getUserOrganizationCode } from "@/lib/action-helpers";
import { revalidatePath } from "next/cache";
import {
  authorizedActionClient,
  resultToActionResponse,
} from "../../../lib/action-client";
import { ProjectTemplateService } from "../../../server/services/project-template.service";
import { createProjectTemplateSchema } from "../../../server/validation/project-templates/create-project-template";

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
    const { user } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated(
        "User not found in context",
        "create-project-template"
      );
    }

    // Get user's organization code
    const orgCode = getUserOrganizationCode(user);

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

