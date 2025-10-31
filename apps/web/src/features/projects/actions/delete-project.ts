"use server";

import { revalidatePath } from "next/cache";
import { authorizedActionClient } from "../../../lib/action-client";
import { ActionErrors } from "../../../lib/action-errors";
import { getAuthSession } from "../../../lib/auth";
import { logger } from "../../../lib/logger";
import { ProjectService } from "../../../server/services";
import { deleteProjectSchema } from "../../../server/validation/projects/delete-project";

/**
 * Delete project action (hard delete with blob cleanup)
 * Requires multi-step confirmation with project name and checkbox
 */
export const deleteProjectAction = authorizedActionClient
  .metadata({
    policy: "projects:delete",
  })
  .inputSchema(deleteProjectSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { projectId, confirmationText, confirmCheckbox } = parsedInput;
    const { user, session } = ctx;

    if (!user || !session) {
      throw ActionErrors.unauthenticated(
        "User or session not found",
        "delete-project"
      );
    }

    // Get organization code
    const authResult = await getAuthSession();
    if (authResult.isErr() || !authResult.value.organization) {
      throw ActionErrors.internal(
        "Failed to get organization context",
        undefined,
        "delete-project"
      );
    }

    const orgCode = authResult.value.organization.orgCode;

    // Get project to validate confirmation
    const projectResult = await ProjectService.getProjectById(projectId);
    if (projectResult.isErr() || !projectResult.value) {
      throw ActionErrors.notFound("Project", "delete-project");
    }

    const project = projectResult.value;

    // Validate confirmation text (must be "DELETE" or exact project name)
    if (
      confirmationText !== "DELETE" &&
      confirmationText !== project.name
    ) {
      throw ActionErrors.validation(
        "Confirmation text does not match. Please type DELETE or the exact project name.",
        { confirmationText }
      );
    }

    // Validate checkbox confirmation
    if (!confirmCheckbox) {
      throw ActionErrors.validation(
        "You must confirm that you understand the consequences of deleting this project.",
        { confirmCheckbox }
      );
    }

    // Delete the project (this will handle blob cleanup internally)
    const result = await ProjectService.deleteProject(
      projectId,
      orgCode,
      user.id
    );

    if (result.isErr()) {
      throw result.error;
    }

    logger.info("Successfully deleted project via action", {
      component: "deleteProjectAction",
      projectId,
      projectName: project.name,
    });

    // Revalidate paths
    revalidatePath("/projects");

    return { data: { success: true } };
  });

