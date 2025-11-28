"use server";

import { logger } from "@/lib/logger";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { AuditLogService } from "@/server/services/audit-log.service";
import { ProjectService } from "@/server/services/project.service";
import { deleteProjectSchema } from "@/server/validation/projects/delete-project";
import { revalidatePath } from "next/cache";

/**
 * Delete project action (hard delete with blob cleanup)
 * Requires multi-step confirmation with project name and checkbox
 */
export const deleteProjectAction = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("projects:delete"),
  })
  .inputSchema(deleteProjectSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { projectId, confirmationText, confirmCheckbox } = parsedInput;
    const { user, organizationId } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated("User not found", "delete-project");
    }

    if (!organizationId) {
      throw ActionErrors.forbidden(
        "Organization context required",
        undefined,
        "delete-project"
      );
    }

    // Get project to validate confirmation
    const projectResult = await ProjectService.getProjectById(projectId);
    if (projectResult.isErr() || !projectResult.value) {
      throw ActionErrors.notFound("Project", "delete-project");
    }

    const project = projectResult.value;

    // Validate confirmation text (must be "DELETE" or exact project name)
    if (confirmationText !== "DELETE" && confirmationText !== project.name) {
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
      organizationId,
      user.id
    );

    if (result.isErr()) {
      throw result.error;
    }

    // Log audit event
    logger.audit.event("project_deleted", {
      resourceType: "project",
      resourceId: projectId,
      userId: user.id,
      organizationId,
      action: "delete",
      metadata: {
        projectName: project.name,
      },
    });

    // Create audit log entry
    await AuditLogService.createAuditLog({
      eventType: "project_deleted",
      resourceType: "project",
      resourceId: projectId,
      userId: user.id,
      organizationId,
      action: "delete",
      metadata: {
        projectName: project.name,
      },
    });

    logger.info("Successfully deleted project via action", {
      component: "deleteProjectAction",
      projectId,
      projectName: project.name,
    });

    // Revalidate paths
    revalidatePath("/projects");

    return { data: { success: true } };
  });

