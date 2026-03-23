import type { KnowledgeBaseScope } from "@/server/db/schema/knowledge-base-entries";
import type {
  KnowledgeEntryDto,
  KnowledgeDocumentDto,
} from "@/server/dto/knowledge-base.dto";
import type { IndexedDocumentDto } from "@/server/dto/knowledge-base-browser.dto";

// Re-exports for convenience
export type { KnowledgeBaseScope } from "@/server/db/schema/knowledge-base-entries";
export type {
  KnowledgeEntryDto,
  KnowledgeDocumentDto,
} from "@/server/dto/knowledge-base.dto";

/**
 * ScopeRef — used by the hot path (getKnowledge, search).
 * organizationId is required. Callers must guarantee non-null org.
 */
export interface ScopeRef {
  readonly projectId?: string | null;
  readonly organizationId: string;
  readonly teamId?: string | null;
}

/**
 * ScopeTarget — used by CRUD mutations.
 * For global scope, scopeId must be null.
 * For organization scope, scopeId is the organizationId.
 * For project scope, scopeId is the projectId.
 * For team scope, scopeId is the teamId.
 */
export interface ScopeTarget {
  readonly scope: KnowledgeBaseScope;
  readonly scopeId: string | null;
}

export interface EntryInput {
  readonly term: string;
  readonly definition: string;
  readonly context?: string | null;
  readonly examples?: string[] | null;
}

export interface UpdateEntryInput {
  readonly term?: string;
  readonly definition?: string;
  readonly context?: string | null;
  readonly examples?: string[] | null;
  readonly isActive?: boolean;
}

export interface DocumentMetadataInput {
  readonly title: string;
  readonly description?: string | null;
}

export interface DocumentBatchInput {
  readonly file: File;
  readonly title: string;
  readonly description?: string | null;
}

export interface SearchOptions {
  readonly limit?: number;
  readonly scoreThreshold?: number;
  readonly useHybrid?: boolean;
  readonly useReranking?: boolean;
}

export interface KnowledgeContext {
  readonly glossary: string;
  readonly entries: ReadonlyArray<KnowledgeEntryDto>;
}

export interface SearchHit {
  readonly id: string;
  readonly content: string;
  readonly similarity: number;
  readonly source: {
    readonly contentType: string;
    readonly documentId?: string;
    readonly title?: string;
    readonly recordingId?: string;
    readonly projectId?: string;
  };
}

export interface DocumentUploadResult {
  readonly document: KnowledgeDocumentDto;
  readonly processingStatus: "pending" | "processing";
}

export interface BatchUploadResult {
  readonly fileName: string;
  readonly success: boolean;
  readonly document?: KnowledgeDocumentDto;
  readonly error?: string;
}

export interface BrowseFilters {
  readonly projectId?: string;
  readonly contentType?: string;
  readonly search?: string;
  readonly limit?: number;
  readonly offset?: string | number | null;
}

export interface BrowseResult {
  readonly documents: IndexedDocumentDto[];
  readonly total: number;
  readonly hasMore: boolean;
  readonly nextOffset: string | number | null;
}

export interface DocumentPreview {
  readonly document: IndexedDocumentDto;
  readonly sampleChunks: Array<{ id: string | number; content: string }>;
  readonly totalChunks: number;
}
