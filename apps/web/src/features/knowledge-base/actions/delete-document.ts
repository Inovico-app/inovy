"use server";

import {
  authorizedActionClient,
  resultToActionResponse,
} from "../../../lib/action-client";
import { ActionErrors } from "../../../lib/action-errors";
import { CacheInvalidation } from "../../../lib/cache-utils";
import { DocumentProcessingService, KnowledgeBaseService } from "../../../server/services";
import { deleteKnowledgeDocumentSchema } from "../../../server/validation/knowledge-base.schema";
import { revalidatePath } from "next/cache";

/**
 * Delete knowledge base document action
 */
export const deleteKnowledgeDocumentAction = authorizedActionClient
  .metadata({
    policy: "projects:update", // Project knowledge requires project access
  })
  .inputSchema(deleteKnowledgeDocumentSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { id } = parsedInput;
    const { user, organizationId } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated(
        "User not found",
        "delete-knowledge-document"
      );
    }

    // Get document first to know its scope for cache invalidation
    const { KnowledgeBaseDocumentsQueries } = await import(
      "../../../server/data-access"
    );
    const document = await KnowledgeBaseDocumentsQueries.getDocumentById(id);

    // Delete document
    const result = await DocumentProcessingService.deleteDocument(id, user.id);

    if (result.isErr()) {
      throw result.error;
    }

    // Invalidate cache based on document scope
    if (document) {
      CacheInvalidation.invalidateKnowledge(document.scope, document.scopeId);
      if (document.scope === "project" && document.scopeId && organizationId) {
        CacheInvalidation.invalidateKnowledgeHierarchy(
          document.scopeId,
          organizationId
        );
      } else if (document.scope === "organization" && document.scopeId) {
        CacheInvalidation.invalidateKnowledgeHierarchy(null, document.scopeId);
      } else if (document.scope === "global") {
        CacheInvalidation.invalidateKnowledgeHierarchy(null, null);
      }
    } else {
      // Document not found - cache invalidation handled by service error
    }

    // Revalidate relevant pages
    revalidatePath(`/settings/organization`);
    revalidatePath(`/projects/[projectId]/settings`);

    return resultToActionResponse(result);
  });

