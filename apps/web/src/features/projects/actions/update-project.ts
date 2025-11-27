"use server";

import {
  authorizedActionClient,
  resultToActionResponse,
} from "@/lib/action-client";
import { ActionErrors } from "@/lib/action-errors";
import { logger } from "@/lib/logger";
import { ProjectService } from "@/server/services/project.service";
import { AuditLogService } from "@/server/services/audit-log.service";
import { updateProjectSchema } from "@/server/validation/projects/update-project";

/**
 * Project update using Result types throughout
 */
export const updateProjectAction = authorizedActionClient
  .metadata({
    policy: "projects:update",
  })
  .inputSchema(updateProjectSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { projectId, name, description } = parsedInput;
    const { organizationId } = ctx;

    if (!organizationId) {
      throw ActionErrors.forbidden(
        "Organization context required",
        undefined,
        "update-project"
      );
    }

    // Update project
    const result = await ProjectService.updateProject(
      projectId,
      { name, description },
      organizationId
    );

    if (result.isErr()) {
      throw result.error;
    }

    const project = result.value;

    // Log audit event
    logger.audit.event("project_updated", {
      resourceType: "project",
      resourceId: projectId,
      userId: ctx.user?.id ?? "unknown",
      organizationId,
      action: "update",
      metadata: {
        projectName: project.name,
        updatedFields: { name, description },
      },
    });

    // Create audit log entry
    await AuditLogService.createAuditLog({
      eventType: "project_updated",
      resourceType: "project",
      resourceId: projectId,
      userId: ctx.user?.id ?? "unknown",
      organizationId,
      action: "update",
      metadata: {
        projectName: project.name,
        updatedFields: { name, description },
      },
    });

    // Convert Result to action response (throws if error)
    return resultToActionResponse(result);
  });

