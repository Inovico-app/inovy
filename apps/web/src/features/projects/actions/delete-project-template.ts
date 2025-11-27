"use server";

import { getUserOrganizationCode } from "@/lib/action-helpers";
import { CacheInvalidation } from "@/lib/cache-utils";
import {
  authorizedActionClient,
  resultToActionResponse,
} from "../../../lib/action-client";
import { policyToPermissions } from "@/lib/permission-helpers";
import { ActionErrors } from "../../../lib/action-errors";
import { ProjectTemplateQueries } from "../../../server/data-access/project-templates.queries";
import { ProjectTemplateService } from "../../../server/services/project-template.service";
import { deleteProjectTemplateSchema } from "../../../server/validation/project-templates/delete-project-template";

/**
 * Delete a project template
 */
export const deleteProjectTemplateAction = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("projects:update"),
  })
  .inputSchema(deleteProjectTemplateSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { id } = parsedInput;
    const { user } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated(
        "User not found in context",
        "delete-project-template"
      );
    }

    // Get user's organization code
    const orgCode = getUserOrganizationCode(user);

    // Get template to find project ID before deletion
    const template = await ProjectTemplateQueries.findById(id, orgCode);

    // Delete template using service
    const result = await ProjectTemplateService.deleteProjectTemplate(
      id,
      orgCode
    );

    // Revalidate project page if template existed
    if (result.isOk() && template) {
      CacheInvalidation.invalidateProject(template.projectId, orgCode);
    }

    return resultToActionResponse(result);
  });

