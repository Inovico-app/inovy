"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { logger } from "@/lib/logger";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import {
  authorizedActionClient,
  resultToActionResponse,
} from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { AuditLogService } from "@/server/services/audit-log.service";
import { ProjectService } from "@/server/services/project.service";
import { createProjectSchema } from "@/server/validation/projects/create-project";

/**
 * Project creation using Result types throughout
 */
export const createProjectAction = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("projects:create"),
  })
  .inputSchema(createProjectSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { name, description } = parsedInput;
    const { user, organizationId } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated(
        "User not found",
        "create-project-smart"
      );
    }

    if (!organizationId) {
      throw ActionErrors.forbidden(
        "Organization context required",
        undefined,
        "create-project"
      );
    }

    // All operations return Results - no exceptions thrown
    const result = await ProjectService.createProject(
      { name, description },
      user,
      organizationId
    );

    if (result.isErr()) {
      throw result.error;
    }

    const project = result.value;

    // Log audit event
    logger.audit.event("project_created", {
      resourceType: "project",
      resourceId: project.id,
      userId: user.id,
      organizationId,
      action: "create",
      metadata: {
        projectName: name,
      },
    });

    // Create audit log entry
    await AuditLogService.createAuditLog({
      eventType: "project_created",
      resourceType: "project",
      resourceId: project.id,
      userId: user.id,
      organizationId,
      action: "create",
      metadata: {
        projectName: name,
      },
    });

    // Revalidate dashboard page to refresh stats
    revalidatePath("/");

    // Convert Result to action response (throws if error)
    return resultToActionResponse(result);
  });

/**
 * Form action demonstrating error handling with Results
 */
export async function createProjectFormAction(
  formData: FormData
): Promise<void> {
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;

  // Use the smart action
  const result = await createProjectAction({
    name,
    description: description || undefined,
  });

  // Handle different error cases
  if (result?.serverError) {
    throw new Error(result.serverError);
  }

  if (result?.validationErrors) {
    const firstFieldErrors = Object.values(result.validationErrors)[0];
    const firstError = Array.isArray(firstFieldErrors)
      ? firstFieldErrors[0]
      : firstFieldErrors?._errors?.[0];
    throw new Error(firstError ?? "Validation failed");
  }

  if (result?.data?.id) {
    redirect(`/projects/${result.data.id}`);
  } else {
    throw new Error("Failed to create project");
  }
}

