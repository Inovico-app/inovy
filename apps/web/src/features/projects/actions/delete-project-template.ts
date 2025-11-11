"use server";

import {
  authorizedActionClient,
  resultToActionResponse,
} from "../../../lib/action-client";
import { ActionErrors } from "../../../lib/action-errors";
import { getAuthSession } from "../../../lib/auth";
import { ProjectTemplateService } from "../../../server/services/project-template.service";
import { ProjectTemplateQueries } from "../../../server/data-access/project-templates.queries";
import { deleteProjectTemplateSchema } from "../../../server/validation/project-templates/delete-project-template";
import { revalidatePath } from "next/cache";

/**
 * Delete a project template
 */
export const deleteProjectTemplateAction = authorizedActionClient
  .metadata({
    policy: "projects:update",
  })
  .inputSchema(deleteProjectTemplateSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { id } = parsedInput;
    const { user, session } = ctx;

    if (!user || !session) {
      throw ActionErrors.unauthenticated(
        "User or session not found",
        "delete-project-template"
      );
    }

    // Get organization code from session
    const authResult = await getAuthSession();
    if (authResult.isErr() || !authResult.value.organization) {
      throw ActionErrors.internal(
        "Failed to get organization context",
        undefined,
        "delete-project-template"
      );
    }

    const orgCode = authResult.value.organization.orgCode;

    // Get template to find project ID before deletion
    const template = await ProjectTemplateQueries.findById(id, orgCode);

    // Delete template using service
    const result = await ProjectTemplateService.deleteProjectTemplate(
      id,
      orgCode
    );

    // Revalidate project page if template existed
    if (result.isOk() && template) {
      revalidatePath(`/projects/${template.projectId}`);
    }

    return resultToActionResponse(result);
  });

