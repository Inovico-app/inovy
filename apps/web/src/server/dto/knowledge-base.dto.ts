/**
 * Data Transfer Objects for Knowledge Base operations
 */

import type { DocumentProcessingStatus } from "../db/schema";
import type { KnowledgeBaseScope } from "../db/schema/knowledge-base-entries";

export interface CreateKnowledgeEntryDto {
  scope: KnowledgeBaseScope;
  scopeId: string | null; // Project UUID, organization code, or null for global
  term: string;
  definition: string;
  context?: string | null;
  examples?: string[] | null;
  createdById: string; // Kinde user ID
}

export interface UpdateKnowledgeEntryDto {
  term?: string;
  definition?: string;
  context?: string | null;
  examples?: string[] | null;
  isActive?: boolean;
}

export interface KnowledgeEntryDto {
  id: string;
  scope: KnowledgeBaseScope;
  scopeId: string | null;
  term: string;
  definition: string;
  context: string | null;
  examples: string[] | null;
  isActive: boolean;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface HierarchicalKnowledgeEntryDto extends KnowledgeEntryDto {
  priority: number; // 1 = project, 2 = organization, 3 = global
}

export interface CreateKnowledgeDocumentDto {
  scope: KnowledgeBaseScope;
  scopeId: string | null; // Project UUID, organization code, or null for global
  title: string;
  description?: string | null;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  createdById: string; // Kinde user ID
}

export interface UpdateKnowledgeDocumentDto {
  title?: string;
  description?: string | null;
  extractedText?: string | null;
  processingStatus?: DocumentProcessingStatus;
  processingError?: string | null;
}

export interface KnowledgeDocumentDto {
  id: string;
  scope: KnowledgeBaseScope;
  scopeId: string | null;
  title: string;
  description: string | null;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  extractedText: string | null;
  processingStatus: DocumentProcessingStatus;
  processingError: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

