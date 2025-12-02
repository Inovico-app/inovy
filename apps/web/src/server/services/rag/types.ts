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
  efSearch?: number; // HNSW ef_search parameter for query-time tuning
}

/**
 * Scalar quantization configuration
 * Compresses vectors to int8 for ~75% memory reduction
 */
export interface ScalarQuantizationConfig {
  type: "int8";
  quantile?: number; // Quantile for quantization (0.0-1.0, default: 0.99)
  always_ram?: boolean; // Keep quantized vectors in RAM (default: true)
}

/**
 * Quantization configuration for Qdrant collections
 */
export interface QuantizationConfig {
  scalar?: ScalarQuantizationConfig;
}

/**
 * Optimizer configuration for segment management
 */
export interface OptimizersConfig {
  deleted_threshold?: number; // Threshold for deleted points before vacuum
  vacuum_min_vector_number?: number; // Minimum vectors before vacuum
  default_segment_number?: number; // Default number of segments
  max_segment_size?: number; // Maximum segment size
  memmap_threshold?: number; // Threshold for memory-mapped storage
  indexing_threshold?: number; // Threshold for indexing
  flush_interval_sec?: number; // Flush interval in seconds
  max_optimization_threads?: number; // Max threads for optimization
}

/**
 * HNSW index configuration
 */
export interface HNSWConfig {
  m?: number; // Number of connections per node (default: 16)
  ef_construct?: number; // Construction time accuracy/speed trade-off (default: 100)
  full_scan_threshold?: number; // Threshold for full scan vs HNSW
  max_indexing_threads?: number; // Max threads for indexing
  on_disk?: boolean; // Store index on disk
}

/**
 * Options for updating a Qdrant collection
 */
export interface CollectionUpdateOptions {
  optimizers_config?: OptimizersConfig;
  hnsw_config?: HNSWConfig;
  quantization_config?: QuantizationConfig;
  on_disk_payload?: boolean;
}

/**
 * Optimization status information
 */
export interface OptimizationStatus {
  optimized: boolean;
  optimizing: boolean;
  segments_count?: number;
  points_count?: number;
  indexed_points_count?: number;
}

// RAG Service Types
export interface SearchResult {
  id: string;
  contentType:
    | "recording"
    | "transcription"
    | "summary"
    | "task"
    | "knowledge_document"
    | "project_template"
    | "organization_instructions";
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

