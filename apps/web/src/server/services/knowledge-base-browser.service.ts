import { getAuthSession } from "@/lib/auth/auth-helpers";
import { logger } from "@/lib/logger";
import {
  ActionErrors,
  type ActionResult,
} from "@/lib/server-action-client/action-errors";
import { KnowledgeBaseDocumentsQueries } from "@/server/data-access/knowledge-base-documents.queries";
import { ProjectQueries } from "@/server/data-access/projects.queries";
import type {
  DocumentPreviewDto,
  IndexedDocumentDto,
  ListDocumentsFilters,
  ListDocumentsResponse,
} from "@/server/dto/knowledge-base-browser.dto";
import { err, ok } from "neverthrow";
import { DocumentProcessingService } from "./document-processing.service";
import { QdrantClientService } from "./rag/qdrant.service";
import type { QdrantFilter } from "./rag/types";

/**
 * Knowledge Base Browser Service
 * Provides methods to browse, search, and manage indexed documents in Qdrant
 */
export class KnowledgeBaseBrowserService {
  private static qdrantService = QdrantClientService.getInstance();

  /**
   * List unique documents from Qdrant with filtering
   */
  static async listDocuments(
    filters: ListDocumentsFilters
  ): Promise<ActionResult<ListDocumentsResponse>> {
    try {
      // Verify authentication
      const authResult = await getAuthSession();
      if (authResult.isErr() || !authResult.value.organization) {
        return err(
          ActionErrors.unauthenticated(
            "Authentication required",
            "KnowledgeBaseBrowserService.listDocuments"
          )
        );
      }

      const organizationId = authResult.value.organization.id;

      // Ensure user can only access their organization's documents
      if (filters.organizationId !== organizationId) {
        return err(
          ActionErrors.forbidden(
            "Access denied",
            undefined,
            "KnowledgeBaseBrowserService.listDocuments"
          )
        );
      }

      // Build Qdrant filter
      const qdrantFilter: QdrantFilter = {
        must: [
          {
            key: "organizationId",
            match: { value: filters.organizationId },
          },
        ],
      };

      if (filters.projectId) {
        qdrantFilter.must?.push({
          key: "projectId",
          match: { value: filters.projectId },
        });
      }

      if (filters.contentType) {
        qdrantFilter.must?.push({
          key: "contentType",
          match: { value: filters.contentType },
        });
      }

      // Query Qdrant for unique documents with pagination
      const documentsResult = await this.qdrantService.listUniqueDocuments(
        qdrantFilter,
        {
          limit: filters.limit ?? 100,
          offset: filters.offset ?? null,
        }
      );

      if (documentsResult.isErr()) {
        return err(documentsResult.error);
      }

      let documents = documentsResult.value.documents;

      // Apply client-side search filter if provided
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        documents = documents.filter(
          (doc) =>
            doc.filename?.toLowerCase().includes(searchLower) ||
            doc.title?.toLowerCase().includes(searchLower) ||
            doc.documentId.toLowerCase().includes(searchLower)
        );
      }

      // Enrich with database information if available
      const enrichedDocuments = await Promise.all(
        documents.map(async (doc) => {
          // Try to find document in database to get processing status
          const dbDocument =
            await KnowledgeBaseDocumentsQueries.getDocumentById(doc.documentId);

          const indexedDoc: IndexedDocumentDto = {
            documentId: doc.documentId,
            contentId: doc.contentId,
            contentType: doc.contentType,
            title: doc.title ?? dbDocument?.title,
            filename: doc.filename ?? dbDocument?.fileName,
            organizationId: doc.organizationId,
            projectId: doc.projectId,
            chunksCount: doc.chunksCount,
            uploadDate: doc.uploadDate ?? dbDocument?.createdAt,
            fileSize: doc.fileSize ?? dbDocument?.fileSize,
            fileType: doc.fileType ?? dbDocument?.fileType,
            processingStatus: dbDocument?.processingStatus,
            processingError: dbDocument?.processingError,
          };

          return indexedDoc;
        })
      );

      return ok({
        documents: enrichedDocuments,
        total: enrichedDocuments.length,
        hasMore: documentsResult.value.hasMore,
        nextOffset: documentsResult.value.nextOffset,
      });
    } catch (error) {
      logger.error("Error listing documents", {
        component: "KnowledgeBaseBrowserService",
        filters,
        error: error instanceof Error ? error.message : String(error),
      });
      return err(
        ActionErrors.internal(
          "Failed to list documents",
          error as Error,
          "KnowledgeBaseBrowserService.listDocuments"
        )
      );
    }
  }

  /**
   * Get document preview with sample chunks
   */
  static async getDocumentPreview(
    documentId: string,
    organizationId: string,
    sampleSize: number = 5
  ): Promise<ActionResult<DocumentPreviewDto>> {
    try {
      // Verify authentication
      const authResult = await getAuthSession();
      if (authResult.isErr() || !authResult.value.organization) {
        return err(
          ActionErrors.unauthenticated(
            "Authentication required",
            "KnowledgeBaseBrowserService.getDocumentPreview"
          )
        );
      }

      // Ensure organization access
      if (authResult.value.organization.id !== organizationId) {
        return err(
          ActionErrors.forbidden(
            "Access denied",
            undefined,
            "KnowledgeBaseBrowserService.getDocumentPreview"
          )
        );
      }

      // Build filter for this document
      const filter: QdrantFilter = {
        must: [
          {
            key: "documentId",
            match: { value: documentId },
          },
          {
            key: "organizationId",
            match: { value: organizationId },
          },
        ],
      };

      // Get document info from listUniqueDocuments
      const listResult = await this.qdrantService.listUniqueDocuments(filter);
      if (listResult.isErr()) {
        return err(listResult.error);
      }

      const docInfo = listResult.value.documents[0];
      if (!docInfo) {
        return err(
          ActionErrors.notFound(
            "Document",
            "KnowledgeBaseBrowserService.getDocumentPreview"
          )
        );
      }

      // Get sample chunks by scrolling
      const scrollResult = await this.qdrantService.scroll(filter, {
        limit: sampleSize,
      });

      if (scrollResult.isErr()) {
        return err(scrollResult.error);
      }

      const sampleChunks = scrollResult.value.map((point) => ({
        id: point.id,
        content: (point.payload?.content as string) ?? "",
        metadata: point.payload,
      }));

      const indexedDoc: IndexedDocumentDto = {
        documentId: docInfo.documentId,
        contentId: docInfo.contentId,
        contentType: docInfo.contentType,
        title: docInfo.title,
        filename: docInfo.filename,
        organizationId: docInfo.organizationId,
        projectId: docInfo.projectId,
        chunksCount: docInfo.chunksCount,
        uploadDate: docInfo.uploadDate,
        fileSize: docInfo.fileSize,
        fileType: docInfo.fileType,
      };

      return ok({
        document: indexedDoc,
        sampleChunks,
        totalChunks: docInfo.chunksCount,
      });
    } catch (error) {
      logger.error("Error getting document preview", {
        component: "KnowledgeBaseBrowserService",
        documentId,
        error: error instanceof Error ? error.message : String(error),
      });
      return err(
        ActionErrors.internal(
          "Failed to get document preview",
          error as Error,
          "KnowledgeBaseBrowserService.getDocumentPreview"
        )
      );
    }
  }

  /**
   * Delete document from Qdrant
   */
  static async deleteDocument(
    documentId: string,
    organizationId: string
  ): Promise<ActionResult<void>> {
    try {
      // Verify authentication
      const authResult = await getAuthSession();
      if (authResult.isErr() || !authResult.value.organization) {
        return err(
          ActionErrors.unauthenticated(
            "Authentication required",
            "KnowledgeBaseBrowserService.deleteDocument"
          )
        );
      }

      // Ensure organization access
      if (authResult.value.organization.id !== organizationId) {
        return err(
          ActionErrors.forbidden(
            "Access denied",
            undefined,
            "KnowledgeBaseBrowserService.deleteDocument"
          )
        );
      }

      // Build filter to delete all chunks for this document
      const filter: QdrantFilter = {
        must: [
          {
            key: "documentId",
            match: { value: documentId },
          },
          {
            key: "organizationId",
            match: { value: organizationId },
          },
        ],
      };

      // Delete from Qdrant
      const deleteResult = await this.qdrantService.deleteByFilter(filter);
      if (deleteResult.isErr()) {
        return err(deleteResult.error);
      }

      // Optionally delete from database if it exists
      try {
        const dbDocument =
          await KnowledgeBaseDocumentsQueries.getDocumentById(documentId);
        if (dbDocument) {
          // Delete chunks from Qdrant (already done above)
          // Delete document record from database
          await KnowledgeBaseDocumentsQueries.deleteDocument(documentId);
        }
      } catch (error) {
        // Log but don't fail if database deletion fails
        logger.warn("Failed to delete document from database", {
          documentId,
          error,
        });
      }

      logger.info("Document deleted", {
        component: "KnowledgeBaseBrowserService",
        documentId,
        organizationId,
      });

      return ok(undefined);
    } catch (error) {
      logger.error("Error deleting document", {
        component: "KnowledgeBaseBrowserService",
        documentId,
        error: error instanceof Error ? error.message : String(error),
      });
      return err(
        ActionErrors.internal(
          "Failed to delete document",
          error as Error,
          "KnowledgeBaseBrowserService.deleteDocument"
        )
      );
    }
  }

  /**
   * Re-index document (if it exists in database)
   */
  static async reindexDocument(
    documentId: string,
    organizationId: string
  ): Promise<ActionResult<void>> {
    try {
      // Verify authentication
      const authResult = await getAuthSession();
      if (authResult.isErr() || !authResult.value.organization) {
        return err(
          ActionErrors.unauthenticated(
            "Authentication required",
            "KnowledgeBaseBrowserService.reindexDocument"
          )
        );
      }

      // Ensure organization access
      if (authResult.value.organization.id !== organizationId) {
        return err(
          ActionErrors.forbidden(
            "Access denied",
            undefined,
            "KnowledgeBaseBrowserService.reindexDocument"
          )
        );
      }

      // Check if document exists in database
      const dbDocument =
        await KnowledgeBaseDocumentsQueries.getDocumentById(documentId);

      if (!dbDocument) {
        return err(
          ActionErrors.notFound(
            "Document not found in database. Re-indexing is only available for documents uploaded through the knowledge base.",
            "KnowledgeBaseBrowserService.reindexDocument"
          )
        );
      }

      // Verify organization access to the document
      // Resolve organization ID from document scope
      // For project scope: load the project to get its organizationId
      // For organization scope: scopeId IS the orgCode
      let documentOrgId: string | null = null;

      if (dbDocument.scope === "project" && dbDocument.scopeId) {
        try {
          documentOrgId = await ProjectQueries.getOrganizationIdByProjectId(
            dbDocument.scopeId
          );
        } catch (error) {
          logger.error("Failed to load project for organization ID", {
            component: "KnowledgeBaseBrowserService",
            documentId,
            scopeId: dbDocument.scopeId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      } else if (dbDocument.scope === "organization" && dbDocument.scopeId) {
        documentOrgId = dbDocument.scopeId;
      }

      if (!documentOrgId || documentOrgId !== organizationId) {
        return err(
          ActionErrors.forbidden(
            "Access denied",
            undefined,
            "KnowledgeBaseBrowserService.reindexDocument"
          )
        );
      }

      // Trigger re-processing
      const processResult =
        await DocumentProcessingService.processDocument(documentId);

      if (processResult.isErr()) {
        return err(processResult.error);
      }

      logger.info("Document re-indexing triggered", {
        component: "KnowledgeBaseBrowserService",
        documentId,
        organizationId,
      });

      return ok(undefined);
    } catch (error) {
      logger.error("Error re-indexing document", {
        component: "KnowledgeBaseBrowserService",
        documentId,
        error: error instanceof Error ? error.message : String(error),
      });
      return err(
        ActionErrors.internal(
          "Failed to re-index document",
          error as Error,
          "KnowledgeBaseBrowserService.reindexDocument"
        )
      );
    }
  }
}

