"use server";

import { CacheInvalidation } from "@/lib/cache-utils";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import {
  authorizedActionClient,
  resultToActionResponse,
} from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { DocumentProcessingService } from "@/server/services/document-processing.service";
import { uploadKnowledgeDocumentSchema } from "@/server/validation/knowledge-base.schema";
import { revalidatePath } from "next/cache";
import { z } from "zod";

/**
 * Upload knowledge base document action
 */
const uploadDocumentInputSchema = uploadKnowledgeDocumentSchema.safeExtend({
  file: z.instanceof(File),
});

export const uploadKnowledgeDocumentAction = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("projects:update"), // Project knowledge requires project access
  })
  .inputSchema(uploadDocumentInputSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { scope, scopeId, title, description, file } = parsedInput;
    const { user, organizationId } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated(
        "User not found",
        "upload-knowledge-document"
      );
    }

    // Upload document
    const result = await DocumentProcessingService.uploadDocument(
      file,
      scope,
      scopeId,
      { title, description },
      user.id
    );

    if (result.isErr()) {
      throw result.error;
    }

    // Invalidate cache
    CacheInvalidation.invalidateKnowledge(scope, scopeId);
    if (scope === "project" && scopeId && organizationId) {
      CacheInvalidation.invalidateKnowledgeHierarchy(scopeId, organizationId);
    } else if (scope === "organization" && scopeId) {
      CacheInvalidation.invalidateKnowledgeHierarchy(null, scopeId);
    } else if (scope === "global") {
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

