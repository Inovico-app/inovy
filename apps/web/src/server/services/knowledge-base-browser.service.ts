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
import type { KnowledgeDocumentDto } from "@/server/dto/knowledge-base.dto";
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
   * Build IndexedDocumentDto from Qdrant document with optional database fallbacks
   */
  private static buildIndexedDocumentDto(
    qdrantDoc: {
      documentId: string;
      contentId: string;
      contentType: string;
      organizationId: string;
      projectId?: string;
      filename?: string;
      fileType?: string;
      fileSize?: number;
      title?: string;
      chunksCount: number;
      uploadDate?: Date;
    },
    dbDocument?: KnowledgeDocumentDto | null
  ): IndexedDocumentDto {
    return {
      documentId: qdrantDoc.documentId,
      contentId: qdrantDoc.contentId,
      contentType: qdrantDoc.contentType,
      title: qdrantDoc.title ?? dbDocument?.title,
      filename: qdrantDoc.filename ?? dbDocument?.fileName,
      organizationId: qdrantDoc.organizationId,
      projectId: qdrantDoc.projectId,
      chunksCount: qdrantDoc.chunksCount,
      uploadDate: qdrantDoc.uploadDate ?? dbDocument?.createdAt,
      fileSize: qdrantDoc.fileSize ?? dbDocument?.fileSize,
      fileType: qdrantDoc.fileType ?? dbDocument?.fileType,
      processingStatus: dbDocument?.processingStatus,
      processingError: dbDocument?.processingError,
    };
  }

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

      const requestedLimit = filters.limit ?? 100;
      const requestedOffset = filters.offset ?? null;
      const hasSearchFilter = !!filters.search;

      let documents: Array<{
        documentId: string;
        contentId: string;
        contentType: string;
        organizationId: string;
        projectId?: string;
        filename?: string;
        fileType?: string;
        fileSize?: number;
        title?: string;
        chunksCount: number;
        uploadDate?: Date;
        metadata?: Record<string, unknown>;
      }> = [];
      let hasMoreFromQdrant = false;
      let nextOffset: string | number | null = null;

      if (hasSearchFilter) {
        // When search is active, we need to fetch larger batches and filter client-side
        // because Qdrant keyword fields don't support substring matching.
        // We'll fetch batches until we have enough filtered results.
        //
        // Note: When offset is provided with search, it's used as a Qdrant offset.
        // This may cause some filtered results to be skipped, as Qdrant pagination
        // doesn't align with filtered result pagination. For perfect pagination with
        // search, consider implementing cursor-based pagination using documentId.
        const qdrantBatchSize = Math.max(requestedLimit * 5, 500);
        let currentOffset: string | number | null = requestedOffset;
        let hasMoreFromQdrant = true;
        const maxScrollBatches = 10; // Limit batches to prevent infinite loops
        let scrollBatchCount = 0;
        let filteredCount = 0;
        const searchLower = filters.search!.toLowerCase();

        // Fetch batches until we have enough filtered results
        while (
          filteredCount < requestedLimit &&
          hasMoreFromQdrant &&
          scrollBatchCount < maxScrollBatches
        ) {
          const documentsResult = await this.qdrantService.listUniqueDocuments(
            qdrantFilter,
            {
              limit: qdrantBatchSize,
              offset: currentOffset,
            }
          );

          if (documentsResult.isErr()) {
            return err(documentsResult.error);
          }

          const batchDocuments = documentsResult.value.documents;

          // Apply client-side search filter
          const filteredBatch = batchDocuments.filter(
            (doc) =>
              doc.filename?.toLowerCase().includes(searchLower) ||
              doc.title?.toLowerCase().includes(searchLower) ||
              doc.documentId.toLowerCase().includes(searchLower)
          );

          // Add filtered documents up to the requested limit
          const remainingNeeded = requestedLimit - filteredCount;
          documents.push(...filteredBatch.slice(0, remainingNeeded));
          filteredCount += Math.min(filteredBatch.length, remainingNeeded);

          // Update pagination state
          hasMoreFromQdrant = documentsResult.value.hasMore;
          currentOffset = documentsResult.value.nextOffset;
          scrollBatchCount++;

          // If we have enough filtered results, stop fetching
          if (filteredCount >= requestedLimit) {
            break;
          }

          // If we got fewer documents than the batch size, we've reached the end
          if (batchDocuments.length < qdrantBatchSize) {
            hasMoreFromQdrant = false;
            break;
          }
        }

        // Store Qdrant pagination state for later use
        hasMoreFromQdrant =
          hasMoreFromQdrant && scrollBatchCount < maxScrollBatches;
        nextOffset = hasMoreFromQdrant ? currentOffset : null;
      } else {
        // No search filter - use Qdrant's pagination directly
        const documentsResult = await this.qdrantService.listUniqueDocuments(
          qdrantFilter,
          {
            limit: requestedLimit,
            offset: requestedOffset,
          }
        );

        if (documentsResult.isErr()) {
          return err(documentsResult.error);
        }

        documents = documentsResult.value.documents;
        hasMoreFromQdrant = documentsResult.value.hasMore;
        nextOffset = documentsResult.value.nextOffset;
      }

      // Batch fetch database documents for enrichment
      const documentIds = documents.map((doc) => doc.documentId);
      const dbDocumentsMap =
        await KnowledgeBaseDocumentsQueries.getDocumentsByIds(documentIds);

      // Enrich with database information if available
      const enrichedDocuments = documents.map((doc) => {
        const dbDocument = dbDocumentsMap.get(doc.documentId);
        return this.buildIndexedDocumentDto(doc, dbDocument);
      });

      // Calculate pagination metadata based on post-filtered results
      // hasMore is true if we got a full page AND there might be more results
      const hasMore =
        enrichedDocuments.length === requestedLimit && hasMoreFromQdrant;

      return ok({
        documents: enrichedDocuments,
        total: enrichedDocuments.length,
        hasMore,
        nextOffset: hasMore ? nextOffset : null,
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

      // Try to get database document for enrichment
      const dbDocument =
        await KnowledgeBaseDocumentsQueries.getDocumentById(documentId);
      const indexedDoc = this.buildIndexedDocumentDto(docInfo, dbDocument);

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

