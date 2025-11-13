"use server";

import {
  authorizedActionClient,
  resultToActionResponse,
} from "../../../lib/action-client";
import { ActionErrors } from "../../../lib/action-errors";
import { CacheInvalidation } from "../../../lib/cache-utils";
import { KnowledgeBaseService } from "../../../server/services";
import { createKnowledgeEntrySchema } from "../../../server/validation/knowledge-base.schema";
import { revalidatePath } from "next/cache";

/**
 * Create knowledge base entry action
 */
export const createKnowledgeEntryAction = authorizedActionClient
  .metadata({
    policy: "projects:update", // Project knowledge requires project access
  })
  .inputSchema(createKnowledgeEntrySchema)
  .action(async ({ parsedInput, ctx }) => {
    const { scope, scopeId, term, definition, context, examples } =
      parsedInput;
    const { user, organizationId } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated(
        "User not found",
        "create-knowledge-entry"
      );
    }

    // Create entry
    const result = await KnowledgeBaseService.createEntry(
      scope,
      scopeId,
      { term, definition, context, examples },
      user.id
    );

    if (result.isErr()) {
      throw ActionErrors.fromResult(result.error);
    }

    // Invalidate cache
    CacheInvalidation.invalidateKnowledge(scope, scopeId);
    if (scope === "project" && scopeId && organizationId) {
      CacheInvalidation.invalidateKnowledgeHierarchy(scopeId, organizationId);
    } else if (scope === "organization" && scopeId) {
      // Invalidate all project hierarchies in this org
      CacheInvalidation.invalidateKnowledgeHierarchy(null, scopeId);
    } else if (scope === "global") {
      // Invalidate all hierarchies
      CacheInvalidation.invalidateKnowledgeHierarchy(null, null);
    }

    // Revalidate relevant pages
    if (scope === "project" && scopeId) {
      revalidatePath(`/projects/${scopeId}/settings`);
    } else if (scope === "organization" && organizationId) {
      revalidatePath(`/settings/organization`);
    }

    return resultToActionResponse(result);
  });

