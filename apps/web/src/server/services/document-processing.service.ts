import { getAuthSession } from "@/lib/auth/auth-helpers";
import { logger } from "@/lib/logger";
import { Permissions } from "@/lib/rbac/permissions";
import { checkPermission } from "@/lib/rbac/permissions-server";
import {
  ActionErrors,
  type ActionResult,
} from "@/lib/server-action-client/action-errors";
import { put as putBlob } from "@vercel/blob";
import { err, ok } from "neverthrow";
import { KnowledgeBaseDocumentsQueries } from "../data-access/knowledge-base-documents.queries";
import { ProjectQueries } from "../data-access/projects.queries";
import type { KnowledgeBaseScope } from "../db/schema/knowledge-base-entries";
import type {
  CreateKnowledgeDocumentDto,
  KnowledgeDocumentDto,
} from "../dto/knowledge-base.dto";
import { DocumentService } from "./document.service";

/**
 * Document Processing Service
 * Handles document upload, text extraction, and embedding creation for knowledge base documents
 */
export class DocumentProcessingService {
  /**
   * Resolve organization ID from document and auth session
   * Priority:
   * 1. authResult.value.organization.id (if present)
   * 2. Persisted document.organization/orgCode field (if available in future schema)
   * 3. For project scope: load Project by scopeId and read its organizationId
   * 4. For organization scope: document.scopeId IS the orgCode
   * 5. Return error if all lookups fail
   */
  private static async resolveOrganizationId(
    document: KnowledgeDocumentDto,
    authResult: Awaited<ReturnType<typeof getAuthSession>>
  ): Promise<ActionResult<string>> {
    // Priority 1: Use organization from auth session if available
    if (
      authResult.isOk() &&
      authResult.value.organization?.id &&
      authResult.value.isAuthenticated
    ) {
      return ok(authResult.value.organization.id);
    }

    // Priority 2: Use persisted document.organization/orgCode field if available
    // Note: This field doesn't exist in current schema but is included for future compatibility
    // If a document.organizationId or document.orgCode field is added, check it here
    // Example: if ((document as any).organizationId) return ok((document as any).organizationId);

    // Priority 3: For project scope, load the project to get its organizationId
    if (document.scope === "project" && document.scopeId) {
      try {
        const organizationId =
          await ProjectQueries.getOrganizationIdByProjectId(document.scopeId);

        if (organizationId) {
          return ok(organizationId);
        }
      } catch (error) {
        logger.error("Failed to load project for organization ID", {
          component: "DocumentProcessingService",
          documentId: document.id,
          scopeId: document.scopeId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Priority 4: For organization scope, scopeId IS the orgCode
    if (document.scope === "organization" && document.scopeId) {
      return ok(document.scopeId);
    }

    // All lookups failed
    return err(
      ActionErrors.internal(
        "Unable to resolve organization ID. Authentication required or document must have valid scope.",
        undefined,
        "DocumentProcessingService.resolveOrganizationId"
      )
    );
  }
  /**
   * Validate that a document belongs to the user's organization based on scope
   * This ensures organization isolation for knowledge base documents
   */
  private static async validateDocumentAccess(
    document: KnowledgeDocumentDto,
    context: string
  ): Promise<ActionResult<void>> {
    try {
      const authResult = await getAuthSession();
      if (authResult.isErr() || !authResult.value.user) {
        return err(
          ActionErrors.unauthenticated("Authentication required", context)
        );
      }

      const userOrgId = authResult.value.organization?.id;
      if (!userOrgId) {
        return err(
          ActionErrors.forbidden(
            "User does not belong to an organization",
            undefined,
            context
          )
        );
      }

      // Validate based on document scope
      if (document.scope === "project") {
        // Project scope: Verify project exists and belongs to user's organization
        if (!document.scopeId) {
          return err(
            ActionErrors.badRequest("Project scope requires scopeId", context)
          );
        }

        const project = await ProjectQueries.findById(
          document.scopeId,
          userOrgId
        );
        if (!project) {
          return err(ActionErrors.notFound("Document", context));
        }
      } else if (document.scope === "organization") {
        // Organization scope: Verify scopeId matches user's organization
        if (!document.scopeId) {
          return err(
            ActionErrors.badRequest(
              "Organization scope requires scopeId",
              context
            )
          );
        }

        if (document.scopeId !== userOrgId) {
          return err(ActionErrors.notFound("Document", context));
        }
      } else if (document.scope === "global") {
        // Global scope: Only super admins can access
        // For now, we'll allow read access but this could be restricted further
        // Note: Write operations should be restricted to super admins
      }

      return ok(undefined);
    } catch (error) {
      logger.error(
        "Failed to validate document access",
        {
          documentId: document.id,
          scope: document.scope,
          scopeId: document.scopeId,
        },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to validate document access",
          error as Error,
          context
        )
      );
    }
  }

  /**
   * Validate scope-specific permissions for document operations
   * Project scope: requires project access
   * Organization scope: requires admin/manager role for write
   * Global scope: requires super admin role for write
   */
  private static async validateScopePermissions(
    scope: KnowledgeBaseScope,
    scopeId: string | null,
    userId: string,
    operation: "read" | "write"
  ): Promise<ActionResult<void>> {
    try {
      const authResult = await getAuthSession();
      if (authResult.isErr() || !authResult.value.user) {
        return err(
          ActionErrors.unauthenticated(
            "Authentication required",
            "DocumentProcessingService.validateScopePermissions"
          )
        );
      }

      const user = authResult.value.user;
      const userOrgId = authResult.value.organization?.id;

      if (!userOrgId) {
        return err(
          ActionErrors.forbidden(
            "User does not belong to an organization",
            undefined,
            "DocumentProcessingService.validateScopePermissions"
          )
        );
      }

      if (scope === "project") {
        // Project scope: Check project exists and user has access
        if (!scopeId) {
          return err(
            ActionErrors.badRequest(
              "Project scope requires scopeId",
              "DocumentProcessingService.validateScopePermissions"
            )
          );
        }

        // Verify project exists and belongs to user's organization
        const project = await ProjectQueries.findById(scopeId, userOrgId);
        if (!project) {
          return err(
            ActionErrors.notFound(
              "Project",
              "DocumentProcessingService.validateScopePermissions"
            )
          );
        }

        // For write operations, check user has project update permission
        // (Read is allowed for any user with project access)
        if (operation === "write") {
          // Project members can write - this is validated by project access check above
        }
      } else if (scope === "organization") {
        // Organization scope: Requires admin or manager role for write
        if (!scopeId) {
          return err(
            ActionErrors.badRequest(
              "Organization scope requires scopeId",
              "DocumentProcessingService.validateScopePermissions"
            )
          );
        }

        // Verify organization matches user's organization
        if (scopeId !== userOrgId) {
          return err(
            ActionErrors.forbidden(
              "Cannot access other organization's knowledge base",
              {
                scope,
                scopeId,
                userId,
              },
              "DocumentProcessingService.validateScopePermissions"
            )
          );
        }

        // For write operations, check permissions using type-safe helper
        if (operation === "write") {
          const hasPermission = await checkPermission(
            Permissions.orgInstruction.write
          );

          if (!hasPermission) {
            return err(
              ActionErrors.forbidden(
                "Organization knowledge base requires admin or manager permissions",
                {
                  scope,
                  scopeId,
                  userId,
                },
                "DocumentProcessingService.validateScopePermissions"
              )
            );
          }
        }
      } else if (scope === "global") {
        // Global scope: Requires super admin role
        if (scopeId !== null) {
          return err(
            ActionErrors.badRequest(
              "Global scope must have null scopeId",
              "DocumentProcessingService.validateScopePermissions"
            )
          );
        }

        // For write operations, check super admin permissions using type-safe helper
        if (operation === "write") {
          const hasPermission = await checkPermission(
            Permissions.superadmin.all
          );

          if (!hasPermission) {
            return err(
              ActionErrors.forbidden(
                "Global knowledge base requires super admin permissions",
                {
                  scope,
                  scopeId,
                  userId,
                },
                "DocumentProcessingService.validateScopePermissions"
              )
            );
          }
        }
      }

      return ok(undefined);
    } catch (error) {
      logger.error(
        "Failed to validate scope permissions",
        { scope, scopeId, userId, operation },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to validate scope permissions",
          error as Error,
          "DocumentProcessingService.validateScopePermissions"
        )
      );
    }
  }

  /**
   * Upload document to Vercel Blob and create database record
   */
  static async uploadDocument(
    file: File,
    scope: KnowledgeBaseScope,
    scopeId: string | null,
    metadata: {
      title: string;
      description?: string | null;
    },
    userId: string
  ): Promise<ActionResult<KnowledgeDocumentDto>> {
    try {
      // Validate scope-specific permissions before upload
      const permissionResult = await this.validateScopePermissions(
        scope,
        scopeId,
        userId,
        "write"
      );
      if (permissionResult.isErr()) {
        return err(
          ActionErrors.forbidden(
            "You are not authorized to upload a document to this scope",
            {
              scope,
              scopeId,
              userId,
            },
            "DocumentProcessingService.uploadDocument"
          )
        );
      }

      // Validate file type
      const allowedTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // DOCX
        "application/msword", // DOC
        "text/plain", // TXT
        "text/markdown", // MD
      ];

      if (!allowedTypes.includes(file.type)) {
        return err(
          ActionErrors.badRequest(
            `File type ${file.type} is not supported. Supported types: PDF, DOCX, TXT, MD`,
            "DocumentProcessingService.uploadDocument"
          )
        );
      }

      // Validate file size (50MB limit)
      const maxSize = 50 * 1024 * 1024; // 50MB in bytes
      if (file.size > maxSize) {
        return err(
          ActionErrors.badRequest(
            `File size exceeds 50MB limit`,
            "DocumentProcessingService.uploadDocument"
          )
        );
      }

      // Upload to Vercel Blob
      const blobPath = `knowledge-base/${scope}/${scopeId ?? "global"}/${
        file.name
      }`;
      const blobResult = await putBlob(blobPath, file, {
        access: "public",
        addRandomSuffix: true,
      });

      // Create document record
      const createDto: CreateKnowledgeDocumentDto = {
        scope,
        scopeId,
        title: metadata.title.trim(),
        description: metadata.description?.trim() ?? null,
        fileUrl: blobResult.url,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        createdById: userId,
      };

      const document =
        await KnowledgeBaseDocumentsQueries.createDocument(createDto);

      logger.info("Document uploaded to knowledge base", {
        documentId: document.id,
        scope,
        scopeId,
        fileName: file.name,
        userId,
      });

      // Start processing asynchronously (don't await)
      this.processDocument(document.id).catch((error) => {
        logger.error(
          "Failed to process document",
          { documentId: document.id },
          error
        );
      });

      return ok(document);
    } catch (error) {
      logger.error(
        "Failed to upload document",
        { scope, scopeId, fileName: file.name },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to upload document",
          error as Error,
          "DocumentProcessingService.uploadDocument"
        )
      );
    }
  }

  /**
   * Process document: extract text and create embeddings
   * Updates processing status throughout the pipeline
   */
  static async processDocument(
    documentId: string
  ): Promise<ActionResult<void>> {
    try {
      // Update status to processing
      await KnowledgeBaseDocumentsQueries.updateProcessingStatus(
        documentId,
        "processing"
      );

      // Get document
      const document =
        await KnowledgeBaseDocumentsQueries.getDocumentById(documentId);
      if (!document) {
        return err(
          ActionErrors.notFound(
            "Document",
            "DocumentProcessingService.processDocument"
          )
        );
      }

      // Resolve organization ID using proper resolution flow
      const authResult = await getAuthSession();
      const orgIdResult = await this.resolveOrganizationId(
        document,
        authResult
      );

      if (orgIdResult.isErr()) {
        await KnowledgeBaseDocumentsQueries.updateProcessingStatus(
          documentId,
          "failed",
          orgIdResult.error.message
        );
        return err(orgIdResult.error);
      }

      const organizationId = orgIdResult.value;

      // Process and index document using Qdrant pipeline
      const pipelineResult =
        await DocumentService.Processing.processAndIndexDocument(
          {
            url: document.fileUrl,
            type: document.fileType,
            name: document.fileName,
          },
          document.createdById,
          {
            documentId: document.id,
            filename: document.fileName,
            fileType: document.fileType,
            fileSize: document.fileSize,
            title: document.title,
            description: document.description ?? undefined,
            organizationId,
            projectId:
              document.scope === "project"
                ? (document.scopeId ?? undefined)
                : undefined,
            userId: document.createdById,
          }
        );

      if (pipelineResult.isErr()) {
        await KnowledgeBaseDocumentsQueries.updateProcessingStatus(
          documentId,
          "failed",
          pipelineResult.error.message
        );
        return err(pipelineResult.error);
      }

      const processedDocument = pipelineResult.value;

      // Update document with extracted text
      await KnowledgeBaseDocumentsQueries.updateDocument(documentId, {
        extractedText: processedDocument.chunks
          .map((chunk) => chunk.content)
          .join("\n\n"),
        processingStatus: "completed",
      });

      logger.info("Document processed successfully", {
        documentId,
        chunkCount: processedDocument.chunks.length,
      });

      return ok(undefined);
    } catch (error) {
      logger.error(
        "Failed to process document",
        { documentId },
        error as Error
      );
      await KnowledgeBaseDocumentsQueries.updateProcessingStatus(
        documentId,
        "failed",
        error instanceof Error ? error.message : "Unknown error"
      );
      return err(
        ActionErrors.internal(
          "Failed to process document",
          error as Error,
          "DocumentProcessingService.processDocument"
        )
      );
    }
  }

  /**
   * Extract text from document based on file type
   * Supports: PDF, DOCX, TXT, MD
   */
  private static async extractTextFromDocument(
    document: KnowledgeDocumentDto
  ): Promise<ActionResult<string>> {
    try {
      const fileType = document.fileType.toLowerCase();

      if (fileType === "text/plain" || fileType === "text/markdown") {
        // For TXT and MD files, fetch and return content
        return await this.extractTextFromUrl(document.fileUrl);
      } else if (
        fileType === "application/pdf" ||
        fileType ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        fileType === "application/msword"
      ) {
        // For PDF and DOCX files, we need libraries like pdf-parse and mammoth
        // For now, return an error indicating these need to be implemented
        // In production, you would:
        // 1. Download the file from blob URL
        // 2. Use pdf-parse for PDFs or mammoth for DOCX
        // 3. Extract text
        return err(
          ActionErrors.internal(
            "PDF and DOCX text extraction requires additional libraries (pdf-parse, mammoth). Please implement or use a text extraction service.",
            "DocumentProcessingService.extractTextFromDocument"
          )
        );
      } else {
        return err(
          ActionErrors.badRequest(
            `Unsupported file type: ${fileType}`,
            "DocumentProcessingService.extractTextFromDocument"
          )
        );
      }
    } catch (error) {
      logger.error(
        "Failed to extract text from document",
        { documentId: document.id },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to extract text from document",
          error as Error,
          "DocumentProcessingService.extractTextFromDocument"
        )
      );
    }
  }

  /**
   * Extract text from URL (for TXT/MD files)
   */
  private static async extractTextFromUrl(
    url: string
  ): Promise<ActionResult<string>> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        return err(
          ActionErrors.internal(
            `Failed to fetch document from URL: ${response.statusText}`,
            "DocumentProcessingService.extractTextFromUrl"
          )
        );
      }

      const text = await response.text();
      return ok(text);
    } catch (error) {
      return err(
        ActionErrors.internal(
          "Failed to fetch document content",
          error as Error,
          "DocumentProcessingService.extractTextFromUrl"
        )
      );
    }
  }

  /**
   * Get document content (extracted text)
   */
  static async getDocumentContent(
    documentId: string
  ): Promise<ActionResult<string>> {
    try {
      const document =
        await KnowledgeBaseDocumentsQueries.getDocumentById(documentId);
      if (!document) {
        return err(
          ActionErrors.notFound(
            "Document",
            "DocumentProcessingService.getDocumentContent"
          )
        );
      }

      // Validate organization access
      const accessResult = await this.validateDocumentAccess(
        document,
        "DocumentProcessingService.getDocumentContent"
      );
      if (accessResult.isErr()) {
        return err(accessResult.error);
      }

      if (!document.extractedText) {
        return err(
          ActionErrors.badRequest(
            "Document text not yet extracted",
            "DocumentProcessingService.getDocumentContent"
          )
        );
      }

      return ok(document.extractedText);
    } catch (error) {
      logger.error(
        "Failed to get document content",
        { documentId },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to get document content",
          error as Error,
          "DocumentProcessingService.getDocumentContent"
        )
      );
    }
  }

  /**
   * Delete document from Blob and database
   */
  static async deleteDocument(
    documentId: string,
    userId: string
  ): Promise<ActionResult<void>> {
    try {
      // Get document to get file URL
      const document =
        await KnowledgeBaseDocumentsQueries.getDocumentById(documentId);
      if (!document) {
        return err(
          ActionErrors.notFound(
            "Document",
            "DocumentProcessingService.deleteDocument"
          )
        );
      }

      // Validate organization access and write permissions
      const accessResult = await this.validateDocumentAccess(
        document,
        "DocumentProcessingService.deleteDocument"
      );
      if (accessResult.isErr()) {
        return err(accessResult.error);
      }

      // Validate write permissions for deletion
      const permissionResult = await this.validateScopePermissions(
        document.scope,
        document.scopeId,
        userId,
        "write"
      );
      if (permissionResult.isErr()) {
        return err(
          ActionErrors.forbidden(
            "You are not authorized to delete a document from this scope",
            {
              scope: document.scope,
              scopeId: document.scopeId,
              userId,
            },
            "DocumentProcessingService.deleteDocument"
          )
        );
      }

      // Resolve organization ID for Qdrant deletion using proper resolution flow
      const orgAuthResult = await getAuthSession();
      const orgIdResult = await this.resolveOrganizationId(
        document,
        orgAuthResult
      );

      if (orgIdResult.isOk()) {
        const organizationId = orgIdResult.value;
        const deleteChunksResult =
          await DocumentService.Processing.deleteDocumentChunks(
            documentId,
            organizationId
          );
        if (deleteChunksResult.isErr()) {
          logger.warn("Failed to delete document chunks from Qdrant", {
            documentId,
            error: deleteChunksResult.error,
          });
          // Continue with database deletion even if Qdrant deletion fails
        }
      } else {
        logger.warn("Failed to resolve organization ID for Qdrant deletion", {
          documentId,
          error: orgIdResult.error,
        });
        // Continue with database deletion even if org resolution fails
      }

      // Delete from Blob storage
      try {
        // Note: Vercel Blob delete requires the blob URL
        // We would need to extract the blob path from the URL or store it separately
        // For now, we'll just delete from database
        // In production, you would:
        // import { del } from "@vercel/blob";
        // await del(document.fileUrl);
        logger.info("Document blob deletion skipped (requires blob path)", {
          documentId,
          fileUrl: document.fileUrl,
        });
      } catch (error) {
        logger.warn("Failed to delete document from blob", {
          documentId,
          error,
        });
        // Continue with database deletion even if blob deletion fails
      }

      // Delete from database
      const deleted =
        await KnowledgeBaseDocumentsQueries.deleteDocument(documentId);
      if (!deleted) {
        return err(
          ActionErrors.notFound(
            "Document",
            "DocumentProcessingService.deleteDocument"
          )
        );
      }

      logger.info("Document deleted", {
        documentId,
        userId,
      });

      return ok(undefined);
    } catch (error) {
      logger.error("Failed to delete document", { documentId }, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to delete document",
          error as Error,
          "DocumentProcessingService.deleteDocument"
        )
      );
    }
  }

  /**
   * Extract terms from document (auto-suggest abbreviations)
   * Uses simple regex patterns to find potential abbreviations
   */
  static async extractTermsFromDocument(
    documentId: string
  ): Promise<ActionResult<string[]>> {
    try {
      const contentResult = await this.getDocumentContent(documentId);
      if (contentResult.isErr()) {
        return err(contentResult.error);
      }

      const text = contentResult.value;

      // Simple regex to find potential abbreviations
      // Pattern: Uppercase letters (2-5 chars) that appear multiple times
      const abbreviationPattern = /\b[A-Z]{2,5}\b/g;
      const matches = text.match(abbreviationPattern) ?? [];

      // Count occurrences and filter common words
      const commonWords = new Set([
        "THE",
        "AND",
        "FOR",
        "ARE",
        "BUT",
        "NOT",
        "YOU",
        "ALL",
        "CAN",
        "HER",
        "WAS",
        "ONE",
        "OUR",
        "OUT",
        "DAY",
        "GET",
        "HAS",
        "HIM",
        "HIS",
        "HOW",
        "ITS",
        "MAY",
        "NEW",
        "NOW",
        "OLD",
        "SEE",
        "TWO",
        "WHO",
        "WAY",
        "USE",
      ]);

      const termCounts = new Map<string, number>();
      for (const match of matches) {
        if (!commonWords.has(match)) {
          termCounts.set(match, (termCounts.get(match) ?? 0) + 1);
        }
      }

      // Return terms that appear at least 2 times
      const suggestedTerms = Array.from(termCounts.entries())
        .filter(([_, count]) => count >= 2)
        .map(([term]) => term)
        .slice(0, 20); // Limit to top 20

      return ok(suggestedTerms);
    } catch (error) {
      logger.error(
        "Failed to extract terms from document",
        { documentId },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to extract terms from document",
          error as Error,
          "DocumentProcessingService.extractTermsFromDocument"
        )
      );
    }
  }
}

