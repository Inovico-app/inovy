/**
 * RAG Service Types
 *
 * Centralized type definitions for all RAG-related services
 */

// Qdrant Types
export interface QdrantPayload {
  userId: string;
  organizationId: string;
  departmentId?: string;
  teamId?: string[];
  projectId?: string;
  content: string;
  filename?: string;
  timestamp?: Date | string;
  [key: string]: unknown;
}

export interface QdrantPoint {
  id: string | number;
  vector: number[];
  payload?: QdrantPayload;
}

/**
 * Shared match condition type for Qdrant filters
 * Supports value matching, text matching, and any-of matching
 */
export interface MatchCondition {
  value?: string | string[];
  text?: string;
  any?: string[];
}

export interface QdrantFilter {
  must?: Array<{
    key: string;
    match?: MatchCondition;
  }>;
}

export interface QdrantSearchOptions {
  limit?: number;
  scoreThreshold?: number;
  filter?: QdrantFilter;
}

// RAG Service Types
export interface SearchResult {
  id: string;
  contentType:
    | "recording"
    | "transcription"
    | "summary"
    | "task"
    | "knowledge_document";
  contentId: string;
  contentText: string;
  similarity: number;
  rerankedScore?: number; // Cross-encoder score from re-ranking
  originalScore?: number; // Original similarity score (preserved from similarity field)
  metadata: {
    title?: string;
    recordingTitle?: string;
    recordingDate?: string;
    recordingId?: string;
    priority?: string;
    status?: string;
    timestamp?: number;
    chunkIndex?: number;
    documentId?: string; // For knowledge documents
    documentTitle?: string; // For knowledge documents
    [key: string]: unknown;
  };
}

export interface RAGSearchOptions {
  limit?: number;
  useHybrid?: boolean;
  useReranking?: boolean;
  filters?: Record<string, unknown>;
  vectorWeight?: number;
  keywordWeight?: number;
  scoreThreshold?: number;
  organizationId?: string;
  projectId?: string;
}

// Hybrid Search Types
export interface HybridSearchOptions {
  userId?: string;
  organizationId?: string;
  projectId?: string;
  limit?: number;
  vectorWeight?: number;
  keywordWeight?: number;
  scoreThreshold?: number;
  filters?: Record<string, unknown>;
  collectionName?: string;
}

export interface RankedResult {
  id: string;
  contentType: string;
  contentId: string;
  contentText: string;
  similarity: number;
  metadata: Record<string, unknown> | null;
  rank: number;
  source: "vector" | "keyword";
}

export interface VectorSearchResult {
  results: RankedResult[];
  hadError: boolean;
  error?: string;
}

