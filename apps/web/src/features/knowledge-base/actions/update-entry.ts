"use server";

import {
  authorizedActionClient,
  createErrorForNextSafeAction,
  resultToActionResponse,
} from "@/lib/action-client";
import { ActionErrors } from "@/lib/action-errors";
import { CacheInvalidation } from "@/lib/cache-utils";
import { KnowledgeBaseService } from "@/server/services";
import { updateKnowledgeEntrySchema } from "@/server/validation/knowledge-base.schema";
import { revalidatePath } from "next/cache";
import { z } from "zod";

/**
 * Update knowledge base entry action
 */
const updateEntryInputSchema = updateKnowledgeEntrySchema.safeExtend({
  id: z.string().uuid("Invalid entry ID"),
});

export const updateKnowledgeEntryAction = authorizedActionClient
  .metadata({
    policy: "projects:update", // Project knowledge requires project access
  })
  .inputSchema(updateEntryInputSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { id, ...updateData } = parsedInput;
    const { user, organizationId } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated(
        "User not found",
        "update-knowledge-entry"
      );
    }

    // Update entry
    const result = await KnowledgeBaseService.updateEntry(
      id,
      updateData,
      user.id
    );

    if (result.isErr()) {
      throw createErrorForNextSafeAction(result.error);
    }

    const entry = result.value;

    // Invalidate cache
    CacheInvalidation.invalidateKnowledge(entry.scope, entry.scopeId);
    if (entry.scope === "project" && entry.scopeId && organizationId) {
      CacheInvalidation.invalidateKnowledgeHierarchy(
        entry.scopeId,
        organizationId
      );
    } else if (entry.scope === "organization" && entry.scopeId) {
      CacheInvalidation.invalidateKnowledgeHierarchy(null, entry.scopeId);
    } else if (entry.scope === "global") {
      CacheInvalidation.invalidateKnowledgeHierarchy(null, null);
    }

    // Revalidate relevant pages
    if (entry.scope === "project" && entry.scopeId) {
      revalidatePath(`/projects/${entry.scopeId}/settings`);
    } else if (entry.scope === "organization" && organizationId) {
      revalidatePath(`/settings/organization`);
    }

    return resultToActionResponse(result);
  });

