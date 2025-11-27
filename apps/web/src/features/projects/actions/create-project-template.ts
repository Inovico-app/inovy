"use server";

import { ActionErrors } from "@/lib/action-errors";
import { getUserOrganizationCode } from "@/lib/action-helpers";
import { CacheInvalidation } from "@/lib/cache-utils";
import { revalidatePath } from "next/cache";
import {
  authorizedActionClient,
  resultToActionResponse,
} from "../../../lib/action-client";
import { policyToPermissions } from "@/lib/permission-helpers";
import { ProjectTemplateService } from "../../../server/services/project-template.service";
import { createProjectTemplateSchema } from "../../../server/validation/project-templates/create-project-template";

/**
 * Create a new project template
 */
export const createProjectTemplateAction = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("projects:update"),
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
      CacheInvalidation.invalidateProject(projectId, orgCode);
      revalidatePath(`/projects/${projectId}/settings`);
    }

    return resultToActionResponse(result);
  });

