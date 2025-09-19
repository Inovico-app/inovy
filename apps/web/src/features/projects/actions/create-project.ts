"use server";

import { redirect } from "next/navigation";

import {
  authorizedActionClient,
  resultToActionResponse,
} from "../../../lib/action-client";
import { ActionErrors } from "../../../lib/action-errors";
import { ProjectService } from "../../../server/services";
import { createProjectSchema } from "../../../server/validation/create-project";

/**
 * Project creation using Result types throughout
 */
export const createProjectAction = authorizedActionClient
  .metadata({
    policy: "projects:create",
  })
  .inputSchema(createProjectSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { name, description } = parsedInput;
    const { user, session } = ctx;

    if (!user || !session) {
      throw ActionErrors.unauthenticated(
        "User or session not found",
        "create-project-smart"
      );
    }

    // All operations return Results - no exceptions thrown
    const result = await ProjectService.createProject(
      { name, description },
      user
    );

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
    throw new Error(firstError || "Validation failed");
  }

  if (result?.data?.id) {
    redirect(`/projects/${result.data.id}`);
  } else {
    throw new Error("Failed to create project");
  }
}

