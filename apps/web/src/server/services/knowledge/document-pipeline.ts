import type { AuthContext } from "@/lib/auth-context";
import { MAX_FILE_SIZE_50MB } from "@/lib/constants/file-sizes";
import { logger } from "@/lib/logger";
import {
  ActionErrors,
  type ActionResult,
} from "@/lib/server-action-client/action-errors";
import { KnowledgeBaseDocumentsQueries } from "@/server/data-access/knowledge-base-documents.queries";
import { ProjectQueries } from "@/server/data-access/projects.queries";
import type { KnowledgeDocumentDto } from "@/server/dto/knowledge-base.dto";
import { DocumentService } from "@/server/services/document.service";
import { err, ok } from "neverthrow";

const COMPONENT = "DocumentPipeline";

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // DOCX
  "application/msword", // DOC
  "text/plain", // TXT
  "text/markdown", // MD
] as const;

/**
 * Supervised document processing pipeline with compensating-action rollback.
 *
 * Replaces the fire-and-forget `.catch()` pattern: every step that can fail
 * will mark the document as "failed" with an error message before returning.
 */
export class DocumentPipeline {
  /**
   * Process a document through the full pipeline:
   * 1. Update status to "processing"
   * 2. Verify document exists
   * 3. Resolve organization ID (fallback chain)
   * 4. Resolve project teamId when document is project-scoped
   * 5. Delegate extract / chunk / embed / index to DocumentService.Processing
   * 6. Update DB with extracted text and "completed" status
   *
   * On failure at any step: mark document as "failed" with error message.
   */
  static async processDocument(
    documentId: string,
    auth?: AuthContext,
  ): Promise<ActionResult<void>> {
    try {
      // Step 1 — mark as processing
      await KnowledgeBaseDocumentsQueries.updateProcessingStatus(
        documentId,
        "processing",
      );

      // Step 2 — verify document exists
      const document =
        await KnowledgeBaseDocumentsQueries.getDocumentById(documentId);

      if (!document) {
        return err(
          ActionErrors.notFound("Document", `${COMPONENT}.processDocument`),
        );
      }

      // Step 3 — resolve organization ID using fallback chain
      const orgIdResult = await this.resolveOrganizationId(document, auth);

      if (orgIdResult.isErr()) {
        await KnowledgeBaseDocumentsQueries.updateProcessingStatus(
          documentId,
          "failed",
          orgIdResult.error.message,
        );
        return err(orgIdResult.error);
      }

      const organizationId = orgIdResult.value;

      // Step 4 — resolve project teamId when document is project-scoped
      const projectId =
        document.scope === "project"
          ? (document.scopeId ?? undefined)
          : undefined;

      let teamId: string[] | undefined;

      if (projectId) {
        const project = await ProjectQueries.findById(
          projectId,
          organizationId,
        );
        teamId = project?.teamId ? [project.teamId] : undefined;
      }

      // Step 5 — extract, chunk, embed, index via DocumentService
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
            projectId,
            teamId,
            userId: document.createdById,
          },
        );

      if (pipelineResult.isErr()) {
        await KnowledgeBaseDocumentsQueries.updateProcessingStatus(
          documentId,
          "failed",
          pipelineResult.error.message,
        );
        return err(pipelineResult.error);
      }

      const processedDocument = pipelineResult.value;

      // Step 6 — persist extracted text and mark as completed
      await KnowledgeBaseDocumentsQueries.updateDocument(documentId, {
        extractedText: processedDocument.chunks
          .map((chunk) => chunk.content)
          .join("\n\n"),
        processingStatus: "completed",
      });

      logger.info("Document processed successfully", {
        component: COMPONENT,
        documentId,
        chunkCount: processedDocument.chunks.length,
      });

      return ok(undefined);
    } catch (error) {
      logger.error(
        "Failed to process document",
        { component: COMPONENT, documentId },
        error as Error,
      );

      await KnowledgeBaseDocumentsQueries.updateProcessingStatus(
        documentId,
        "failed",
        error instanceof Error ? error.message : "Unknown error",
      );

      return err(
        ActionErrors.internal(
          "Failed to process document",
          error as Error,
          `${COMPONENT}.processDocument`,
        ),
      );
    }
  }

  /**
   * Validate a file before upload (type + size checks).
   */
  static validateFile(file: File): ActionResult<void> {
    const context = `${COMPONENT}.validateFile`;

    if (
      !ALLOWED_FILE_TYPES.includes(
        file.type as (typeof ALLOWED_FILE_TYPES)[number],
      )
    ) {
      return err(
        ActionErrors.badRequest(
          `File type ${file.type} is not supported. Supported types: PDF, DOCX, TXT, MD`,
          context,
        ),
      );
    }

    if (file.size > MAX_FILE_SIZE_50MB) {
      return err(
        ActionErrors.badRequest("File size exceeds 50MB limit", context),
      );
    }

    return ok(undefined);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Resolve organization ID from document and optional auth context.
   *
   * Priority:
   * 1. auth.organizationId (if present)
   * 2. For project scope: load project to get its organizationId
   * 3. For organization scope: document.scopeId IS the orgId
   * 4. Return error if all lookups fail
   */
  private static async resolveOrganizationId(
    document: KnowledgeDocumentDto,
    auth?: AuthContext,
  ): Promise<ActionResult<string>> {
    // Priority 1 — auth context
    if (auth?.organizationId) {
      return ok(auth.organizationId);
    }

    // Priority 2 — project scope: look up project's organizationId
    if (document.scope === "project" && document.scopeId) {
      try {
        const organizationId =
          await ProjectQueries.getOrganizationIdByProjectId(document.scopeId);

        if (organizationId) {
          return ok(organizationId);
        }
      } catch (error) {
        logger.error("Failed to load project for organization ID", {
          component: COMPONENT,
          documentId: document.id,
          scopeId: document.scopeId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Priority 3 — organization scope: scopeId IS the orgId
    if (document.scope === "organization" && document.scopeId) {
      return ok(document.scopeId);
    }

    // All lookups failed
    return err(
      ActionErrors.internal(
        "Unable to resolve organization ID. Authentication required or document must have valid scope.",
        undefined,
        `${COMPONENT}.resolveOrganizationId`,
      ),
    );
  }
}
