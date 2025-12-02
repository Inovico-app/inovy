"use server";

import { CacheInvalidation } from "@/lib/cache-utils";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import {
  authorizedActionClient,
  resultToActionResponse,
} from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { DocumentProcessingService } from "@/server/services/document-processing.service";
import {
  uploadKnowledgeDocumentSchema,
  uploadKnowledgeDocumentsBatchSchema,
} from "@/server/validation/knowledge-base.schema";
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

/**
 * Upload knowledge base documents batch action
 */
const uploadDocumentsBatchInputSchema = z
  .object({
    scope: uploadKnowledgeDocumentsBatchSchema.shape.scope,
    scopeId: uploadKnowledgeDocumentsBatchSchema.shape.scopeId,
    fileArray: z.array(z.instanceof(File)),
    metadataArray: z
      .array(
        z.object({
          title: z
            .string()
            .trim()
            .min(1, "Title is required")
            .max(200, "Title must be less than 200 characters"),
          description: z
            .string()
            .max(1000, "Description must be less than 1000 characters")
            .nullable()
            .optional(),
        })
      )
      .min(1, "At least one file is required")
      .max(20, "Maximum 20 files allowed per batch"),
    sharedDescription: uploadKnowledgeDocumentsBatchSchema.shape.sharedDescription,
  })
  .superRefine((data, ctx) => {
    // Validate scope rules
    if (data.scope === "global") {
      if (data.scopeId !== null && data.scopeId !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "scopeId must be null or undefined when scope is 'global'",
          path: ["scopeId"],
        });
      }
    } else if (data.scope === "project" || data.scope === "organization") {
      if (!data.scopeId || data.scopeId.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `scopeId is required and must be a non-empty string when scope is '${data.scope}'`,
          path: ["scopeId"],
        });
      }
    }

    // Validate arrays match
    if (data.fileArray.length !== data.metadataArray.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Files array length must match metadata array length",
        path: ["fileArray"],
      });
    }
  });

export const uploadKnowledgeDocumentsBatchAction = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("projects:update"), // Project knowledge requires project access
  })
  .inputSchema(uploadDocumentsBatchInputSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { scope, scopeId, fileArray, metadataArray, sharedDescription } =
      parsedInput;
    const { user, organizationId } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated(
        "User not found",
        "upload-knowledge-documents-batch"
      );
    }

    // Validate that files array matches metadata array
    if (fileArray.length !== metadataArray.length) {
      throw ActionErrors.badRequest(
        "Files array length must match metadata array length",
        "upload-knowledge-documents-batch"
      );
    }

    // Prepare files with metadata
    const filesWithMetadata = fileArray.map((file, index) => ({
      file,
      title: metadataArray[index]?.title ?? file.name.replace(/\.[^/.]+$/, ""),
      description:
        metadataArray[index]?.description ?? sharedDescription ?? null,
    }));

    // Upload documents batch
    const result =
      await DocumentProcessingService.uploadDocumentsBatch(
        filesWithMetadata,
        scope,
        scopeId,
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

