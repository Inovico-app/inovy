"use server";

import { authorizedActionClient } from "@/lib/action-client";
import { ActionErrors } from "@/lib/action-errors";
import { TaskService } from "@/server/services";
import { z } from "zod";

const createTagSchema = z.object({
  name: z.string().min(1, "Tag name is required").max(50, "Tag name is too long"),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid color format"),
});

/**
 * Server action to create a new tag
 */
export const createTag = authorizedActionClient
  .metadata({ policy: "tasks:create" })
  .schema(createTagSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { organizationId } = ctx;

    if (!organizationId) {
      throw ActionErrors.forbidden("Organization context required");
    }

    const result = await TaskService.createTag({
      name: parsedInput.name,
      color: parsedInput.color,
      organizationId,
    });

    if (result.isErr()) {
      throw ActionErrors.internal(
        result.error.message,
        result.error,
        "create-tag"
      );
    }

    return result.value;
  });

