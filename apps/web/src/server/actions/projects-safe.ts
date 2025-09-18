"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { ActionErrors } from "@/lib";
import { authorizedActionClient, safeAsync } from "../../lib/action-client";
import { ProjectQueries } from "../data-access";
import type { CreateProjectDto } from "../dto";
import { ensureUserInDatabase } from "../helpers/user";

/**
 * Input validation schema for creating a project
 */
const createProjectSchema = z.object({
  name: z
    .string()
    .min(1, "Project name is required")
    .max(100, "Project name must be less than 100 characters"),
  description: z.string().optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

/**
 * Create a new project - Safe Action implementation
 * Uses the authorized action client with authentication and authorization
 */
export const createProjectSafeAction = authorizedActionClient
  .metadata({
    policy: "projects:create",
  })
  .inputSchema(createProjectSchema)
  .action(async ({ parsedInput, ctx, metadata }) => {
    const { name, description } = parsedInput;
    const { user, session, logger } = ctx;

    if (!user || !session) {
      throw ActionErrors.unauthenticated(
        "User not authenticated",
        metadata.policy
      );
    }

    // Ensure user exists in database
    const syncResult = await ensureUserInDatabase(user, session.user);
    if (syncResult.isErr()) {
      throw ActionErrors.internal(
        "Failed to sync user data",
        new Error(syncResult.error),
        metadata.policy
      );
    }

    const dbUser = syncResult.value;

    // Create project data
    const projectData: CreateProjectDto = {
      name,
      description,
      organizationId: dbUser.organizationId,
      createdById: dbUser.id,
    };

    // Use safe async wrapper for database operation
    const createResult = await safeAsync(
      () => ProjectQueries.create(projectData),
      "INTERNAL_SERVER_ERROR"
    );

    if (createResult.isErr()) {
      throw createResult.error;
    }

    const newProject = createResult.value;

    logger.info("Project created successfully", {
      projectId: newProject.id,
      userId: dbUser.id,
      organizationId: dbUser.organizationId,
      component: "create-project-action",
    });

    return {
      projectId: newProject.id,
      success: true,
    };
  });

/**
 * Form action wrapper for the safe action
 * This demonstrates how to handle form submissions with the new system
 */
export async function createProjectFormAction(
  formData: FormData
): Promise<void> {
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;

  // Use the safe action
  const result = await createProjectSafeAction({
    name,
    description: description || undefined,
  });

  // Handle the result
  if (result?.serverError) {
    throw new Error(result.serverError);
  }

  if (result?.validationErrors) {
    const firstFieldErrors = Object.values(result.validationErrors)[0];
    const firstError = Array.isArray(firstFieldErrors)
      ? firstFieldErrors[0]
      : firstFieldErrors?._errors?.[0];
    throw new Error(firstError || "Validation failed");
  }

  if (result?.data?.projectId) {
    redirect(`/projects/${result.data.projectId}`);
  } else {
    throw new Error("Failed to create project");
  }
}

