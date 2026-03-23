"use server";

import type { AuthContext } from "@/lib/auth-context";
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
    name: "delete-knowledge-document",
    permissions: policyToPermissions("projects:update"), // Project knowledge requires project access
    audit: {
      resourceType: "knowledge_base_document",
      action: "delete",
      category: "mutation",
    },
  })
  .inputSchema(deleteKnowledgeDocumentSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { id } = parsedInput;
    const { user, organizationId } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated(
        "User not found",
        "delete-knowledge-document",
      );
    }

    if (!organizationId) {
      throw ActionErrors.forbidden(
        "Organization context required",
        undefined,
        "delete-knowledge-document",
      );
    }

    // Get document first to know its scope for cache invalidation
    const { KnowledgeBaseDocumentsQueries } =
      await import("../../../server/data-access/knowledge-base-documents.queries");
    const document = await KnowledgeBaseDocumentsQueries.getDocumentById(id);

    const auth: AuthContext = {
      user,
      organizationId,
      userTeamIds: ctx.userTeamIds ?? [],
    };

    // Delete document
    const result = await DocumentProcessingService.deleteDocument(
      id,
      user.id,
      auth,
    );

    if (result.isErr()) {
      throw result.error;
    }

    // Revalidate relevant pages
    if (document?.scope === "project" && document.scopeId) {
      revalidatePath(`/projects/${document.scopeId}/settings`);
    } else if (document?.scope === "team" && document.scopeId) {
      revalidatePath(`/teams/${document.scopeId}/settings`);
    } else if (document?.scope === "organization") {
      revalidatePath(`/settings/organization`);
    }

    return resultToActionResponse(result);
  });
