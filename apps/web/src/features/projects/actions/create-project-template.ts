"use server";

import { CacheInvalidation } from "@/lib/cache-utils";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { getUserOrganizationId } from "@/lib/server-action-client/action-helpers";
import { revalidatePath } from "next/cache";
import {
  authorizedActionClient,
  resultToActionResponse,
} from "../../../lib/server-action-client/action-client";
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
    const { user, organizationId } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated(
        "User not found in context",
        "create-project-template"
      );
    }

    // Get user's organization ID
    const orgCode = getUserOrganizationId(user, organizationId);

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

