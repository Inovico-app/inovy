# Knowledge Module Deep Refactor — Design Spec

**GitHub Issue**: [#591](https://github.com/Inovico-app/inovy/issues/591)
**Date**: 2026-03-23
**Status**: Approved

## Problem

The Knowledge Base and Document Processing pipeline is split across 5 services (~4,844 LOC) with blurred boundaries:

| Service                     | LOC   | Role                                                                                           |
| --------------------------- | ----- | ---------------------------------------------------------------------------------------------- |
| `KnowledgeBaseService`      | 1,139 | KB entry CRUD + document CRUD + scope permission validation                                    |
| `DocumentProcessingService` | 1,160 | Document upload + processing + **duplicate** scope permission validation                       |
| `DocumentService`           | 940   | Text extraction, chunking, embedding (Redis-cached), Qdrant indexing via nested static classes |
| `EmbeddingService`          | 257   | Embedding generation with PostgreSQL DB caching                                                |
| `RAGService`                | 1,348 | Vector search orchestration (Qdrant hybrid + reranking)                                        |

### Key Friction Points

1. **Duplicated scope permission validation (~300 LOC)** — nearly identical `validateScopePermissions()` in both KnowledgeBaseService and DocumentProcessingService
2. **Two competing document CRUD paths** — KnowledgeBaseService.createDocument (DB only) vs DocumentProcessingService.uploadDocument (DB + blob + processing)
3. **Two embedding implementations** — DocumentService.Embedding (Redis cache) vs EmbeddingService (PostgreSQL cache), same OpenAI model
4. **Fire-and-forget processing** — `processDocument()` runs async with `.catch()` swallowing errors; no retry, no user notification
5. **No pipeline rollback** — failed embedding leaves orphaned blobs; blob deletion is a TODO
6. **Confusing nested class pattern** — DocumentService.Processing is an alias for DocumentService.Qdrant

## Design Decision

**Hybrid of 4 evaluated designs**, optimizing for the hot path (ChatPipeline calls this on every message) while keeping explicit CRUD for mutations.

### Alternatives Considered

1. **Minimal Interface (3 methods)** — `search()`, `ingest()`, `manage()`. Too restrictive for admin/browse operations.
2. **Flexible Interface (4 namespaces, ~20 methods)** — Full CRUD per domain concept. Good extensibility but over-engineered for current needs.
3. **Hot-Path Optimized (2 tiers)** — Zero-ceremony reads + explicit CRUD. Best caller ergonomics. **Selected as base.**
4. **Ports & Adapters (full hexagonal)** — 5 port interfaces for swappable backends. Premature abstraction for a codebase that doesn't swap providers.

### Why the Hybrid

- Design 3's hot-path optimization makes the most common caller (ChatPipeline) trivial
- Design 2's `ScopeTarget` type prevents the bug-prone `(scope, scopeId)` loose params
- Design 4's compensating-action rollback pattern is essential for pipeline safety
- No premature port interfaces — extract ports when a swap is actually needed

## Proposed Interface

### Scope Types

```typescript
/**
 * ScopeRef — used by the hot path (getKnowledge, search).
 * organizationId is required; callers must guarantee a non-null org.
 * The current KnowledgeBaseService.getApplicableKnowledge accepts null org
 * and returns ok([]) — the new module preserves this behavior internally
 * but the public type enforces non-null to push the check to the caller boundary.
 */
interface ScopeRef {
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
interface ScopeTarget {
  readonly scope: KnowledgeBaseScope; // "project" | "team" | "organization" | "global"
  readonly scopeId: string | null;
}
```

### Input Types

```typescript
interface EntryInput {
  readonly term: string;
  readonly definition: string;
  readonly context?: string | null;
  readonly examples?: string[] | null;
}

interface UpdateEntryInput {
  readonly term?: string;
  readonly definition?: string;
  readonly context?: string | null;
  readonly examples?: string[] | null;
  readonly isActive?: boolean;
}

interface DocumentMetadataInput {
  readonly title: string;
  readonly description?: string | null;
}

interface DocumentBatchInput {
  readonly file: File;
  readonly title: string;
  readonly description?: string | null;
}

interface SearchOptions {
  readonly limit?: number; // default 8
  readonly scoreThreshold?: number; // default 0.6
  readonly useHybrid?: boolean; // default true
  readonly useReranking?: boolean; // default true
}

interface BrowseFilters {
  readonly projectId?: string;
  readonly contentType?: string;
  readonly search?: string;
  readonly limit?: number;
  readonly offset?: string | number | null;
}
```

### Return Types

```typescript
interface KnowledgeContext {
  readonly glossary: string; // Pre-formatted for prompt injection
  readonly entries: ReadonlyArray<KnowledgeEntryDto>; // Structured access
}

interface SearchHit {
  readonly id: string;
  readonly content: string;
  readonly similarity: number;
  readonly source: { contentType: string; documentId?: string; title?: string };
}

interface DocumentUploadResult {
  readonly document: KnowledgeDocumentDto;
  readonly processingStatus: "pending" | "processing";
}

interface BatchUploadResult {
  readonly fileName: string;
  readonly success: boolean;
  readonly document?: KnowledgeDocumentDto;
  readonly error?: string;
}

interface BrowseResult {
  readonly documents: IndexedDocumentDto[];
  readonly total: number;
  readonly hasMore: boolean;
  readonly nextOffset: string | number | null;
}

interface DocumentPreview {
  readonly document: IndexedDocumentDto;
  readonly sampleChunks: Array<{ id: string | number; content: string }>;
  readonly totalChunks: number;
}
```

### KnowledgeModule Public API

```typescript
import type { ActionResult } from "@/lib/server-action-client/action-errors";

export class KnowledgeModule {
  // HOT PATH — no AuthContext, called on every chat message
  static getKnowledge(scope: ScopeRef): Promise<ActionResult<KnowledgeContext>>;
  static search(
    query: string,
    scope: ScopeRef,
    options?: SearchOptions,
  ): Promise<ActionResult<SearchHit[]>>;

  // ENTRIES CRUD — requires auth for mutations
  static listEntries(
    target: ScopeTarget,
    auth: AuthContext,
    options?: { includeInactive?: boolean },
  ): Promise<ActionResult<KnowledgeEntryDto[]>>;
  static searchEntries(
    target: ScopeTarget,
    searchTerm: string,
    auth: AuthContext,
  ): Promise<ActionResult<KnowledgeEntryDto[]>>;
  static createEntry(
    target: ScopeTarget,
    data: EntryInput,
    auth: AuthContext,
  ): Promise<ActionResult<KnowledgeEntryDto>>;
  static updateEntry(
    entryId: string,
    data: UpdateEntryInput,
    auth: AuthContext,
  ): Promise<ActionResult<KnowledgeEntryDto>>;
  static deleteEntry(
    entryId: string,
    auth: AuthContext,
  ): Promise<ActionResult<void>>;
  static promoteEntry(
    entryId: string,
    toScope: KnowledgeBaseScope,
    auth: AuthContext,
  ): Promise<ActionResult<KnowledgeEntryDto>>;

  // DOCUMENTS — supervised pipeline with rollback
  static uploadDocument(
    file: File,
    target: ScopeTarget,
    metadata: DocumentMetadataInput,
    auth: AuthContext,
  ): Promise<ActionResult<DocumentUploadResult>>;
  static uploadDocumentsBatch(
    files: DocumentBatchInput[],
    target: ScopeTarget,
    auth: AuthContext,
  ): Promise<ActionResult<BatchUploadResult[]>>;
  static deleteDocument(
    documentId: string,
    auth: AuthContext,
  ): Promise<ActionResult<void>>;
  static reindexDocument(
    documentId: string,
    auth: AuthContext,
  ): Promise<ActionResult<void>>;
  static getDocumentContent(
    documentId: string,
    auth: AuthContext,
  ): Promise<ActionResult<string>>;
  static getDocumentForView(
    documentId: string,
    auth: AuthContext,
  ): Promise<ActionResult<KnowledgeDocumentDto>>;
  static extractTermSuggestions(
    documentId: string,
    auth: AuthContext,
  ): Promise<ActionResult<string[]>>;

  // ADMIN / BROWSING
  static browseIndex(
    auth: AuthContext,
    filters: BrowseFilters,
  ): Promise<ActionResult<BrowseResult>>;
  static getDocumentPreview(
    documentId: string,
    auth: AuthContext,
  ): Promise<ActionResult<DocumentPreview>>;
}
```

**Note on `uploadDocumentsBatch`**: This is not new functionality — `DocumentProcessingService.uploadDocumentsBatch` already exists (lines 292-527). The new module preserves its behavior (parallel processing, upfront validation, partial failure per file) under the unified API.

## Internal Architecture

### File Structure

The module lives under `src/server/services/knowledge/` to align with the existing convention (the chat module lives at `src/server/services/chat/`, not under a `modules/` directory).

```
src/server/services/knowledge/
  index.ts                    # KnowledgeModule static facade (public API)
  types.ts                    # ScopeRef, ScopeTarget, SearchHit, KnowledgeContext, etc.
  scope-guard.ts              # Single permission validation (replaces 2x duplication)
  document-pipeline.ts        # Supervised processing with compensating-action rollback
  embedding-gateway.ts        # Consolidates Redis + DB embedding caching
  search-engine.ts            # Wraps Qdrant hybrid search + reranker
  text-extractor.ts           # PDF/DOCX/TXT extraction (from DocumentService.Processor)
  semantic-chunker.ts         # Chunking (from DocumentService.SemanticChunker)
```

### Internal Module Responsibilities

**ScopeGuard** — Single implementation of scope permission validation. Replaces the ~150 LOC duplicated in both KnowledgeBaseService and DocumentProcessingService. Handles project/team/organization/global permission checks, team membership verification, RBAC checks via `checkPermission()`. Exported as a set of static methods (consistent with codebase conventions).

**DocumentPipeline** — Supervised processing with compensating actions:

1. Upload blob → on failure: return error
2. Create DB record (status: processing) → on failure: delete blob
3. Extract text → on failure: mark "failed" in DB
4. Chunk text → on failure: mark "failed" in DB
5. Generate embeddings → on failure: mark "failed" in DB
6. Upsert vectors → on failure: mark "failed" in DB
7. Update DB (status: completed) → on failure: log warning

Replaces the fire-and-forget `.catch()` pattern. Static class with static methods.

**EmbeddingGateway** — Static class that consolidates the two competing implementations. Holds a lazy-initialized singleton `EmbeddingService` instance (for DB-cached query embeddings) and delegates to `DocumentService.Embedding` static methods (for Redis-cached batch ingestion embeddings) during Phase 1. In Phase 3, the gateway absorbs both implementations into a single caching strategy. Callers never choose which backend to use.

**SearchEngine** — Static class wrapping a lazy-initialized `RAGService` instance. The current `RAGService` is instance-based with constructor-injected dependencies (`QdrantClientService.getInstance()`, `HybridSearchEngine`, `RerankerService`, `EmbeddingService`). The `SearchEngine` static facade creates and holds a module-level singleton `RAGService` instance on first access. This preserves the existing lifecycle while presenting a static interface to `KnowledgeModule`. In tests, `SearchEngine` methods can be mocked via `vi.spyOn`.

**TextExtractor** — PDF (pdf-parse), DOCX (mammoth), TXT/MD (direct fetch). Moved from DocumentService.Processor. Static methods.

**SemanticChunker** — Recursive character splitting with configurable overlap. Moved from DocumentService.SemanticChunker. Static methods.

### ActionResult Import Convention

All module files import `ActionResult` from `@/lib/server-action-client/action-errors` (the canonical source). This resolves the inconsistency where `KnowledgeBaseService` imports from `action-client` while `DocumentProcessingService` imports from `action-errors`.

## Dependency Strategy

| Dependency   | Strategy                                                                               |
| ------------ | -------------------------------------------------------------------------------------- |
| PostgreSQL   | Direct query class usage internally. No abstraction.                                   |
| Qdrant       | Keep QdrantClientService singleton internally. Mock at SearchEngine boundary in tests. |
| OpenAI       | EmbeddingGateway wraps internally. Mock the gateway in tests.                          |
| Blob Storage | Use existing `getStorageProvider()`. Implement actual blob deletion (fix the TODO).    |
| Redis        | Inside EmbeddingGateway only. Optional, degrades gracefully.                           |

## Migration Strategy

**Phase 1**: Build the module alongside existing code. Write boundary tests. Old services remain untouched.

**Phase 2**: Migrate callers one at a time:

1. **Chat pipeline** — `chat-pipeline.service.ts` imports `KnowledgeBaseService.buildKnowledgeContext()`; `chat-context.service.ts` imports `RAGService.search()`. Both migrate to `KnowledgeModule.getKnowledge()` and `KnowledgeModule.search()`. Also update `prompt-builder.service.ts` if it directly formats the glossary string.
2. **AI services** — `SummaryService`, `TranscriptionService`, `TaskExtractionService` call `getApplicableKnowledge()`. Migrate to `KnowledgeModule.getKnowledge()`.
3. **Server actions** — Entry CRUD actions, document upload/delete actions. Migrate to `KnowledgeModule.*` methods.
4. **API routes** — Document view, KB browser, reindex endpoints. Migrate to `KnowledgeModule.browseIndex()`, `.getDocumentPreview()`, `.reindexDocument()`.
5. **Existing tests** — Update `chat/__tests__/chat-pipeline.service.test.ts` which references `KnowledgeBaseService`.

Old services can temporarily delegate to the new module during migration.

**Phase 3**: Delete old services:

- `knowledge-base.service.ts` — fully replaced by KnowledgeModule
- `document-processing.service.ts` — fully replaced by KnowledgeModule + DocumentPipeline
- `document.service.ts` — nested classes absorbed into text-extractor, semantic-chunker, embedding-gateway, document-pipeline
- `knowledge-base-browser.service.ts` — replaced by KnowledgeModule.browseIndex/getDocumentPreview
- `embedding.service.ts` — **retained** if callers outside the knowledge domain still use it (e.g., RAGService recording/summary indexing). Otherwise absorbed into EmbeddingGateway.
- `rag/` directory — **retained**. RAGService also handles non-KB indexing (recordings, summaries, tasks via `indexProject()`). SearchEngine wraps it for KB search; the RAG directory stays for non-KB use cases.

## Testing Strategy

### New boundary tests

- `getKnowledge()` — hierarchical merge, deduplication, empty scope
- `search()` — ranked results, team scoping, empty index
- `uploadDocument()` — full pipeline, embedding failure rollback, Qdrant failure rollback, invalid file type
- `deleteDocument()` — full cleanup, partial failure handling
- `ScopeGuard` — permission checks per scope level

### Test environment

- Mock for OpenAI (deterministic zero-vectors)
- Mock for QdrantClientService (in-memory)
- Drizzle mock or PGLite for metadata

### Existing tests to update

- `src/server/services/chat/__tests__/chat-pipeline.service.test.ts` — references `KnowledgeBaseService`, needs update after Phase 2 step 1

## Expected Impact

- ~600 LOC eliminated (duplicated validation, dual embeddings, alias boilerplate)
- Pipeline safety: orphaned blobs and silent failures replaced with rollback + status tracking
- Blob deletion TODO fixed
- Chat pipeline call sites simplified from multi-import + manual merging to single `KnowledgeModule` import
