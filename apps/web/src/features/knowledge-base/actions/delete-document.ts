"use server";

import { CacheInvalidation } from "@/lib/cache-utils";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import {
  authorizedActionClient,
  resultToActionResponse,
} from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { DocumentProcessingService } from "@/server/services/document-processing.service";
import { deleteKnowledgeDocumentSchema } from "@/server/validation/knowledge-base.schema";
import { revalidatePath } from "next/cache";

/**
 * Delete knowledge base document action
 */
export const deleteKnowledgeDocumentAction = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("projects:update"), // Project knowledge requires project access
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
    const { KnowledgeBaseDocumentsQueries } =
      await import("../../../server/data-access/knowledge-base-documents.queries");
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
    if (document?.scope === "project" && document.scopeId) {
      revalidatePath(`/projects/${document.scopeId}/settings`);
    } else if (document?.scope === "organization") {
      revalidatePath(`/settings/organization`);
    }

    return resultToActionResponse(result);
  });

