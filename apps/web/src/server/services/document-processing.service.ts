import { put as putBlob } from "@vercel/blob";
import { ActionErrors, type ActionResult } from "@/lib/action-errors";
import { logger } from "@/lib/logger";
import { EmbeddingService } from "./embedding.service";
import { KnowledgeBaseDocumentsQueries } from "../data-access";
import type {
  KnowledgeDocumentDto,
  CreateKnowledgeDocumentDto,
} from "../dto/knowledge-base.dto";
import type { KnowledgeBaseScope } from "../db/schema/knowledge-base-entries";
import { err, ok } from "neverthrow";

/**
 * Document Processing Service
 * Handles document upload, text extraction, and embedding creation for knowledge base documents
 */
export class DocumentProcessingService {
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
      const blobPath = `knowledge-base/${scope}/${scopeId ?? "global"}/${file.name}`;
      const blobResult = await putBlob(blobPath, file, {
        access: "public",
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
        logger.error("Failed to process document", { documentId: document.id }, error);
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
      const document = await KnowledgeBaseDocumentsQueries.getDocumentById(
        documentId
      );
      if (!document) {
        return err(
          ActionErrors.notFound(
            "Document",
            "DocumentProcessingService.processDocument"
          )
        );
      }

      // Extract text from document
      const extractResult = await this.extractTextFromDocument(document);
      if (extractResult.isErr()) {
        await KnowledgeBaseDocumentsQueries.updateProcessingStatus(
          documentId,
          "failed",
          extractResult.error.message
        );
        return extractResult;
      }

      const extractedText = extractResult.value;

      // Update document with extracted text
      await KnowledgeBaseDocumentsQueries.updateDocument(documentId, {
        extractedText,
        processingStatus: "completed",
      });

      // Create embeddings for the document
      // Note: This uses the same embedding pattern as recordings
      const embeddingResult = await this.createDocumentEmbeddings(
        documentId,
        extractedText,
        document.scopeId ?? undefined
      );
      if (embeddingResult.isErr()) {
        logger.warn("Failed to create embeddings for document", {
          documentId,
          error: embeddingResult.error,
        });
        // Don't fail the whole process if embeddings fail
      }

      logger.info("Document processed successfully", {
        documentId,
        textLength: extractedText.length,
      });

      return ok(undefined);
    } catch (error) {
      logger.error("Failed to process document", { documentId }, error as Error);
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
   * Create embeddings for document text
   * Uses the same chunking and embedding strategy as recordings
   */
  private static async createDocumentEmbeddings(
    documentId: string,
    text: string,
    organizationId?: string
  ): Promise<ActionResult<void>> {
    try {
      // Use EmbeddingService to create embeddings
      // Note: This would need to be adapted to work with knowledge base documents
      // For now, we'll create a basic embedding of the full text
      const embeddingResult = await EmbeddingService.generateEmbedding(text);
      if (embeddingResult.isErr()) {
        return err(embeddingResult.error);
      }

      // Store embedding in embeddings table
      // Note: This would need a new content_type for knowledge base documents
      // For now, we'll log that embeddings were created
      logger.info("Document embeddings created", {
        documentId,
        textLength: text.length,
      });

      // TODO: Store embeddings in embeddings table with content_type='knowledge_document'
      // This would require:
      // 1. Adding 'knowledge_document' to contentTypeEnum
      // 2. Creating embedding entries with documentId as contentId
      // 3. Chunking long documents similar to how recordings are chunked

      return ok(undefined);
    } catch (error) {
      logger.error(
        "Failed to create document embeddings",
        { documentId },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to create document embeddings",
          error as Error,
          "DocumentProcessingService.createDocumentEmbeddings"
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
      const document = await KnowledgeBaseDocumentsQueries.getDocumentById(
        documentId
      );
      if (!document) {
        return err(
          ActionErrors.notFound(
            "Document",
            "DocumentProcessingService.getDocumentContent"
          )
        );
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
      const document = await KnowledgeBaseDocumentsQueries.getDocumentById(
        documentId
      );
      if (!document) {
        return err(
          ActionErrors.notFound(
            "Document",
            "DocumentProcessingService.deleteDocument"
          )
        );
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
      const deleted = await KnowledgeBaseDocumentsQueries.deleteDocument(
        documentId
      );
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
        return contentResult;
      }

      const text = contentResult.value;

      // Simple regex to find potential abbreviations
      // Pattern: Uppercase letters (2-5 chars) that appear multiple times
      const abbreviationPattern = /\b[A-Z]{2,5}\b/g;
      const matches = text.match(abbreviationPattern) || [];

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
          termCounts.set(match, (termCounts.get(match) || 0) + 1);
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

