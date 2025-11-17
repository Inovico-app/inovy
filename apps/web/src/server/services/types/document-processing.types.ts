/**
 * Type definitions for document processing pipeline
 */

export interface DocumentMetadata {
  filename?: string;
  fileType?: string;
  fileSize?: number;
  title?: string;
  description?: string;
  documentId?: string;
  userId?: string;
  organizationId?: string;
  projectId?: string;
  departmentId?: string;
  teamId?: string[];
  [key: string]: unknown;
}

export interface DocumentChunk {
  id: string;
  content: string;
  index: number;
  metadata: DocumentMetadata & {
    chunkIndex: number;
    totalChunks: number;
  };
}

export interface ProcessedDocument {
  documentId: string;
  userId: string;
  chunks: DocumentChunk[];
  metadata: DocumentMetadata;
  processedAt: Date;
}

export interface ChunkingOptions {
  chunkSize: number;
  chunkOverlap: number;
  respectSentenceBoundaries?: boolean;
  respectParagraphBoundaries?: boolean;
}

