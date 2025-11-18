"use server";

import { authorizedActionClient } from "@/lib/action-client";
import { ActionErrors } from "@/lib/action-errors";
import { logger } from "@/lib/logger";
import { ProjectService } from "@/server/services";
import { AuditLogService } from "@/server/services/audit-log.service";
import { archiveProjectSchema } from "@/server/validation/projects/archive-project";

/**
 * Archive project action
 */
export const archiveProjectAction = authorizedActionClient
  .metadata({
    policy: "projects:delete",
  })
  .inputSchema(archiveProjectSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { projectId } = parsedInput;
    const { organizationId } = ctx;

    if (!organizationId) {
      throw ActionErrors.forbidden(
        "Organization context required",
        undefined,
        "archive-project"
      );
    }

    // Archive project
    const result = await ProjectService.archiveProject(
      projectId,
      organizationId
    );

    if (result.isErr()) {
      throw ActionErrors.internal(
        result.error.message,
        undefined,
        "archive-project"
      );
    }

    // Log audit event
    logger.audit.event("project_archived", {
      resourceType: "project",
      resourceId: projectId,
      userId: ctx.user?.id ?? "unknown",
      organizationId,
      action: "archive",
    });

    // Create audit log entry
    await AuditLogService.createAuditLog({
      eventType: "project_archived",
      resourceType: "project",
      resourceId: projectId,
      userId: ctx.user?.id ?? "unknown",
      organizationId,
      action: "archive",
    });

    return { data: { success: result.value } };
  });

