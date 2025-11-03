"use server";

import { authorizedActionClient } from "@/lib/action-client";
import { TaskTagsQueries } from "@/server/data-access";
import { getAuthSession } from "@/lib/auth";
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
  .action(async ({ parsedInput }) => {
    const authResult = await getAuthSession();
    
    if (authResult.isErr() || !authResult.value.organization) {
      throw new Error("Authentication required");
    }
    
    const { organization } = authResult.value;
    
    const result = await TaskTagsQueries.createTag({
      name: parsedInput.name,
      color: parsedInput.color,
      organizationId: organization.orgCode,
    });
    
    if (result.isErr()) {
      throw new Error(result.error.message);
    }
    
    return result.value;
  });

