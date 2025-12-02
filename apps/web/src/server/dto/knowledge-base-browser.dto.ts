/**
 * DTOs for Knowledge Base Browser feature
 * Represents indexed documents from Qdrant with aggregated metadata
 */

export interface IndexedDocumentDto {
  documentId: string;
  contentId: string;
  contentType: string;
  title?: string;
  filename?: string;
  organizationId: string;
  projectId?: string;
  chunksCount: number;
  uploadDate?: Date;
  fileSize?: number;
  fileType?: string;
  processingStatus?: "pending" | "processing" | "completed" | "failed";
  processingError?: string | null;
}

export interface ListDocumentsFilters {
  organizationId: string;
  projectId?: string;
  contentType?: string;
  search?: string;
  limit?: number;
  offset?: string | number | null;
}

export interface ListDocumentsResponse {
  documents: IndexedDocumentDto[];
  total: number;
  hasMore: boolean;
  nextOffset: string | number | null;
}

export interface DocumentPreviewDto {
  document: IndexedDocumentDto;
  sampleChunks: Array<{
    id: string | number;
    content: string;
    metadata?: Record<string, unknown>;
  }>;
  totalChunks: number;
}

