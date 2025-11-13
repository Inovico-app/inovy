"use server";

import {
  authorizedActionClient,
  resultToActionResponse,
} from "../../../lib/action-client";
import { ActionErrors } from "../../../lib/action-errors";
import { CacheInvalidation } from "../../../lib/cache-utils";
import { KnowledgeBaseService } from "../../../server/services";
import { deleteKnowledgeEntrySchema } from "../../../server/validation/knowledge-base.schema";
import { revalidatePath } from "next/cache";

/**
 * Delete knowledge base entry action (soft delete)
 */
export const deleteKnowledgeEntryAction = authorizedActionClient
  .metadata({
    policy: "projects:update", // Project knowledge requires project access
  })
  .inputSchema(deleteKnowledgeEntrySchema)
  .action(async ({ parsedInput, ctx }) => {
    const { id } = parsedInput;
    const { user, organizationId } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated(
        "User not found",
        "delete-knowledge-entry"
      );
    }

    // Get entry first to know its scope for cache invalidation
    // We need to query by ID - for now, we'll get it from the service after deletion
    // The service returns the entry scope in the error if not found, so we can handle it
    // Actually, we need to fetch it before deletion. Let's use a direct query approach.
    const { KnowledgeBaseEntriesQueries } = await import(
      "../../../server/data-access"
    );
    const entry = await KnowledgeBaseEntriesQueries.getEntryById(id);

    // Delete entry
    const result = await KnowledgeBaseService.deleteEntry(id, user.id);

    if (result.isErr()) {
      throw result.error;
    }

    // Invalidate cache based on entry scope
    if (entry) {
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
    } else {
      // Entry not found - cache invalidation handled by service error
    }

    // Revalidate relevant pages
    revalidatePath(`/settings/organization`);
    revalidatePath(`/projects/[projectId]/settings`);

    return resultToActionResponse(result);
  });

