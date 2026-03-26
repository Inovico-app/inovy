# Knowledge Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate 5 scattered KB/document-processing services into one unified `KnowledgeModule` with a hot-path optimized API, single scope-guard, supervised document pipeline with rollback, and unified embedding gateway.

**Architecture:** Static facade class (`KnowledgeModule`) backed by internal sub-modules (`ScopeGuard`, `DocumentPipeline`, `EmbeddingGateway`, `SearchEngine`, `TextExtractor`, `SemanticChunker`). Phase 1 builds the module alongside existing code. Phase 2 migrates callers. Phase 3 deletes old services.

**Tech Stack:** TypeScript, neverthrow (Result types), Drizzle ORM, Qdrant, OpenAI embeddings, pdf-parse, mammoth, Next.js 16 cache

**Spec:** `docs/superpowers/specs/2026-03-23-knowledge-module-design.md`
**Issue:** [#591](https://github.com/Inovico-app/inovy/issues/591)

---

## Phase 1: Build the Module

### Task 1: Create module types

**Files:**

- Create: `src/server/services/knowledge/types.ts`

- [ ] **Step 1: Create the types file**

```typescript
// src/server/services/knowledge/types.ts
import type { ActionResult } from "@/lib/server-action-client/action-errors";
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
```

- [ ] **Step 2: Verify no type errors**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy && pnpm --filter web exec tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors related to `knowledge/types.ts`

- [ ] **Step 3: Commit**

```bash
git add src/server/services/knowledge/types.ts
git commit -m "refactor(knowledge): add module types for KnowledgeModule (#591)"
```

---

### Task 2: Create ScopeGuard

Extracts the duplicated `validateScopePermissions()` from both `KnowledgeBaseService` (lines 962-1138) and `DocumentProcessingService` (lines 155-286) into a single implementation.

**Files:**

- Create: `src/server/services/knowledge/scope-guard.ts`

- [ ] **Step 1: Create scope-guard.ts**

Port the logic from `KnowledgeBaseService.validateScopePermissions()` into a standalone static class. The implementation handles all 4 scope types (project, team, organization, global) with read/write permission checks. Use the `context` parameter for error messages so callers can identify the source.

Key imports needed:

- `ProjectQueries.findById` for project scope validation
- `TeamQueries.selectTeamById` for team scope validation
- `UserTeamQueries.selectUserTeam` for team membership checks
- `checkPermission` from `@/lib/rbac/permissions-server` for RBAC checks
- `Permissions.orgInstruction.write` and `Permissions.admin.all` / `Permissions.superadmin.all` for permission presets

The method signature should be:

```typescript
static async validate(
  scope: KnowledgeBaseScope,
  scopeId: string | null,
  userId: string,
  operation: "read" | "write",
  auth: AuthContext,
  context?: string,
): Promise<ActionResult<void>>
```

Copy the implementation from `KnowledgeBaseService.validateScopePermissions()` (lines 962-1138) but:

- Use the `context` param (defaulting to `"ScopeGuard.validate"`) in all error messages
- Keep the same permission logic: project members can write, team requires membership for write, organization requires `orgInstruction.write` for write, global requires `admin.all` for write (note: KnowledgeBaseService uses `Permissions.admin.all` while DocumentProcessingService uses `Permissions.superadmin.all` — use `Permissions.admin.all` as the canonical version since it matches the broader codebase pattern)

Also add a helper for document access validation (ported from `DocumentProcessingService.validateDocumentAccess`, lines 86-147):

```typescript
static async validateDocumentAccess(
  document: KnowledgeDocumentDto,
  auth: AuthContext,
  context?: string,
): Promise<ActionResult<void>>
```

- [ ] **Step 2: Verify no type errors**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy && pnpm --filter web exec tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 3: Commit**

```bash
git add src/server/services/knowledge/scope-guard.ts
git commit -m "refactor(knowledge): extract ScopeGuard from duplicated validation (#591)"
```

---

### Task 3: Create TextExtractor and SemanticChunker

Move text extraction and chunking from `DocumentService` nested classes into standalone files.

**Files:**

- Create: `src/server/services/knowledge/text-extractor.ts`
- Create: `src/server/services/knowledge/semantic-chunker.ts`

- [ ] **Step 1: Create text-extractor.ts**

Port `DocumentService.Processor`'s text extraction methods (lines 247-403 of `document.service.ts`). The class should have:

- `static async extractText(file: File | { url: string; type: string; name: string }): Promise<ActionResult<string>>` — dispatches by file type
- Private methods: `extractFromText`, `extractFromPDF`, `extractFromDocx`
- Also port `cleanText` (line 419-424) as a static method

Imports: `pdf-parse` (`pdfParse`), `mammoth`, `ActionErrors`, `logger`, `neverthrow`

- [ ] **Step 2: Create semantic-chunker.ts**

Port `DocumentService.SemanticChunker` (lines 33-162 of `document.service.ts`). The class should have:

- `static async chunk(text: string, options: ChunkingOptions): Promise<string[]>`
- Private methods: `getSeparators`, `recursiveSplit`, `applyOverlap`, `splitByCharacter`

Import `ChunkingOptions` from `@/server/services/types/document-processing.types`.

- [ ] **Step 3: Verify no type errors**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy && pnpm --filter web exec tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 4: Commit**

```bash
git add src/server/services/knowledge/text-extractor.ts src/server/services/knowledge/semantic-chunker.ts
git commit -m "refactor(knowledge): extract TextExtractor and SemanticChunker (#591)"
```

---

### Task 4: Create EmbeddingGateway

Consolidates `DocumentService.Embedding` (Redis-cached, lines 450-691 of `document.service.ts`) and standalone `EmbeddingService` (DB-cached, `embedding.service.ts`) behind a single internal class.

**Files:**

- Create: `src/server/services/knowledge/embedding-gateway.ts`

- [ ] **Step 1: Create embedding-gateway.ts**

During Phase 1, the gateway delegates to the existing implementations rather than reimplementing:

- For single embedding generation (query-time): delegate to `EmbeddingService` instance (DB-cached, uses `connectionPool.executeWithRetry`)
- For batch embedding generation (ingestion-time): delegate to `DocumentService.Embedding.generateBatchEmbeddings` (Redis-cached)
- Expose `getModelInfo()` that delegates to `DocumentService.Embedding.getModelInfo()`

```typescript
import { EmbeddingService } from "@/server/services/embedding.service";
import { DocumentService } from "@/server/services/document.service";

export class EmbeddingGateway {
  private static embeddingService: EmbeddingService | null = null;

  private static getEmbeddingService(): EmbeddingService {
    if (!this.embeddingService) {
      this.embeddingService = new EmbeddingService();
    }
    return this.embeddingService;
  }

  static async generateEmbedding(
    text: string,
  ): Promise<ActionResult<number[]>> {
    return this.getEmbeddingService().generateEmbedding(text);
  }

  static async generateBatchEmbeddings(
    texts: string[],
  ): Promise<ActionResult<number[][]>> {
    return DocumentService.Embedding.generateBatchEmbeddings(texts);
  }

  static getModelInfo() {
    return DocumentService.Embedding.getModelInfo();
  }
}
```

This is a thin delegation layer in Phase 1. In Phase 3, the two implementations can be consolidated.

- [ ] **Step 2: Verify no type errors**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy && pnpm --filter web exec tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 3: Commit**

```bash
git add src/server/services/knowledge/embedding-gateway.ts
git commit -m "refactor(knowledge): add EmbeddingGateway consolidation layer (#591)"
```

---

### Task 5: Create SearchEngine

Wraps `RAGService` for KB-specific search with a static interface.

**Files:**

- Create: `src/server/services/knowledge/search-engine.ts`

- [ ] **Step 1: Create search-engine.ts**

The SearchEngine is a static facade over a lazy-initialized `RAGService` singleton. It translates `ScopeRef` + `SearchOptions` into `RAGSearchOptions`, and maps `SearchResult[]` to `SearchHit[]`.

Key implementation:

- Lazy singleton: `private static ragService: RAGService | null = null;`
- Two search methods:
  1. `static async search(query: string, scope: ScopeRef, options?: SearchOptions): Promise<ActionResult<SearchHit[]>>`
     - Creates the `RAGService` on first call
     - Maps `ScopeRef` fields to `RAGSearchOptions` (organizationId, projectId, teamId)
     - Applies defaults for options (limit: 8, scoreThreshold: 0.6, useHybrid: true, useReranking: true)
     - Maps `SearchResult` to `SearchHit` (extracting `content`, `similarity: score`, and `source` metadata)
  2. `static async searchRaw(query: string, scope: ScopeRef & { userTeamIds?: string[]; isOrgAdmin?: boolean }, options?: SearchOptions): Promise<ActionResult<SearchResult[]>>`
     - Same as `search()` but returns raw `SearchResult[]` without mapping to `SearchHit`
     - Passes through `userTeamIds` and `isOrgAdmin` to `RAGSearchOptions` for team-based filtering
     - Used by `ChatContextService` which needs the full `SearchResult` metadata for source citation formatting and uses `SearchResultFormatter.limitResultsByTokens()`

Import `RAGService` from `@/server/services/rag/rag.service` and `SearchResult` from `@/server/services/rag/types`.

- [ ] **Step 2: Verify no type errors**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy && pnpm --filter web exec tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 3: Commit**

```bash
git add src/server/services/knowledge/search-engine.ts
git commit -m "refactor(knowledge): add SearchEngine wrapping RAGService (#591)"
```

---

### Task 6: Create DocumentPipeline

The supervised document processing pipeline with compensating-action rollback. This is the most critical piece — it replaces the fire-and-forget `.catch()` pattern.

**Files:**

- Create: `src/server/services/knowledge/document-pipeline.ts`

- [ ] **Step 1: Create document-pipeline.ts**

Port logic from `DocumentProcessingService.processDocument()` (lines 659-776) but with proper rollback:

```typescript
export class DocumentPipeline {
  /**
   * Process a document through the full pipeline:
   * 1. Update status to "processing"
   * 2. Resolve organization ID
   * 3. Extract text → chunk → embed → index in Qdrant
   * 4. Update DB with extracted text and "completed" status
   *
   * On failure at any step: mark document as "failed" with error message.
   */
  static async processDocument(documentId: string): Promise<ActionResult<void>>;
}
```

The implementation follows the existing `DocumentProcessingService.processDocument()` logic (lines 659-776) but:

- Wraps each step in try/catch with `KnowledgeBaseDocumentsQueries.updateProcessingStatus(documentId, "failed", error)` on failure
- Uses `TextExtractor` and `SemanticChunker` from this module instead of `DocumentService.Processor`
- Uses `EmbeddingGateway` instead of `DocumentService.Embedding`
- Delegates Qdrant indexing to `DocumentService.Qdrant.processAndIndexDocument()` (reuse existing Qdrant point construction for now)

Also port:

- `resolveOrganizationId()` from `DocumentProcessingService` (lines 35-81) as a private method
- File validation logic (allowed types, max size) as `static validateFile(file: File): ActionResult<void>`

- [ ] **Step 2: Verify no type errors**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy && pnpm --filter web exec tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 3: Commit**

```bash
git add src/server/services/knowledge/document-pipeline.ts
git commit -m "refactor(knowledge): add DocumentPipeline with supervised processing (#591)"
```

---

### Task 7: Create KnowledgeModule facade

The main entry point that wires all internal modules together.

**Files:**

- Create: `src/server/services/knowledge/index.ts`

- [ ] **Step 1: Create index.ts with hot-path methods**

Start with the two hot-path methods that don't require AuthContext:

```typescript
// getKnowledge — delegates to KnowledgeBaseEntriesQueries.getHierarchicalEntries
// and formats the glossary string (ported from KnowledgeBaseService.buildKnowledgeContext)
static async getKnowledge(scope: ScopeRef): Promise<ActionResult<KnowledgeContext>>

// search — delegates to SearchEngine.search
static async search(query: string, scope: ScopeRef, options?: SearchOptions): Promise<ActionResult<SearchHit[]>>
```

`getKnowledge` implementation:

1. Call `KnowledgeBaseEntriesQueries.getHierarchicalEntries(scope.projectId ?? null, scope.organizationId, scope.teamId)`
2. Strip `priority` field from results to get `KnowledgeEntryDto[]`
3. Format glossary string (port logic from `KnowledgeBaseService.buildKnowledgeContext`, lines 704-716)
4. Return `{ glossary, entries }`

`search` just delegates to `SearchEngine.search(query, scope, options)`.

- [ ] **Step 2: Add entry CRUD methods**

Add all entry methods that delegate to existing `KnowledgeBaseService` methods but use `ScopeGuard` for validation and `ScopeTarget` for scope params:

- `listEntries` → calls `ScopeGuard.validate` then `KnowledgeBaseEntriesQueries.getEntriesByScope`
- `searchEntries` → calls `ScopeGuard.validate` then `KnowledgeBaseEntriesQueries.searchEntries`
- `createEntry` → port from `KnowledgeBaseService.createEntry` (lines 244-331), using `ScopeGuard.validate`
- `updateEntry` → port from `KnowledgeBaseService.updateEntry` (lines 336-446), using `ScopeGuard.validate`
- `deleteEntry` → port from `KnowledgeBaseService.deleteEntry` (lines 451-521), using `ScopeGuard.validate`
- `promoteEntry` → port from `KnowledgeBaseService.promoteEntry` (lines 526-672), using `ScopeGuard.validate`

Key change: userId is extracted from `auth.user.id` internally — no separate userId param.

- [ ] **Step 3: Add document methods**

- `uploadDocument` → port from `DocumentProcessingService.uploadDocument` (lines 532-653), using `ScopeGuard.validate` and `DocumentPipeline.processDocument`
- `uploadDocumentsBatch` → port from `DocumentProcessingService.uploadDocumentsBatch` (lines 292-527), using `ScopeGuard.validate`
- `deleteDocument` → port from `DocumentProcessingService.deleteDocument` (lines 951-1074), using `ScopeGuard.validateDocumentAccess` and `DocumentService.Processing.deleteDocumentChunks`
- `reindexDocument` → delegates to `DocumentPipeline.processDocument(documentId)` (the new supervised pipeline), NOT to the old `DocumentProcessingService`. First deletes existing Qdrant vectors via `DocumentService.Processing.deleteDocumentChunks()`, then re-processes.
- `getDocumentContent` → port from `DocumentProcessingService.getDocumentContent` (lines 896-946)
- `getDocumentForView` → port from `DocumentProcessingService.getDocumentForView` (lines 868-891)
- `extractTermSuggestions` → port from `DocumentProcessingService.extractTermsFromDocument` (lines 1080-1159)

Key change in `uploadDocument`: instead of fire-and-forget `this.processDocument(id).catch(...)`, call `DocumentPipeline.processDocument(id)` as fire-and-forget but with proper error logging (the pipeline handles its own status updates).

- [ ] **Step 4: Add admin/browse methods**

- `browseIndex` → delegate to `KnowledgeBaseBrowserService.listDocuments` (temporary delegation in Phase 1)
- `getDocumentPreview` → delegate to `KnowledgeBaseBrowserService.getDocumentPreview` (temporary delegation)

- [ ] **Step 5: Export types from index.ts**

Add type re-exports to `index.ts` so callers can do `import { KnowledgeModule, type ScopeRef } from "@/server/services/knowledge"`.

Since `KnowledgeModule` is already defined and exported from `index.ts`, only add the type re-exports (do NOT re-export `KnowledgeModule` from itself — that would be a circular import):

```typescript
// At the top of index.ts, add:
export type {
  ScopeRef,
  ScopeTarget,
  EntryInput,
  UpdateEntryInput,
  DocumentMetadataInput,
  DocumentBatchInput,
  SearchOptions,
  KnowledgeContext,
  SearchHit,
  DocumentUploadResult,
  BatchUploadResult,
  BrowseFilters,
  BrowseResult,
  DocumentPreview,
} from "./types";
```

- [ ] **Step 6: Verify no type errors**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy && pnpm --filter web exec tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 7: Commit**

```bash
git add src/server/services/knowledge/
git commit -m "refactor(knowledge): add KnowledgeModule facade with full API (#591)"
```

---

### Task 8: Write boundary tests

**Files:**

- Create: `src/server/services/knowledge/__tests__/scope-guard.test.ts`
- Create: `src/server/services/knowledge/__tests__/knowledge-module.test.ts`

- [ ] **Step 1: Write ScopeGuard tests**

Test the core permission validation logic:

- Project scope with valid project → `ok()`
- Project scope with null scopeId → `err(BAD_REQUEST)`
- Project scope with non-existent project → `err(NOT_FOUND)`
- Team scope write without membership → `err(FORBIDDEN)`
- Organization scope write without permission → `err(FORBIDDEN)`
- Global scope with non-null scopeId → `err(BAD_REQUEST)`
- Global scope write without admin → `err(FORBIDDEN)`

Mock: `ProjectQueries`, `TeamQueries`, `UserTeamQueries`, `checkPermission`

- [ ] **Step 2: Write KnowledgeModule.getKnowledge tests**

Test the hot-path method:

- Returns glossary + entries for valid scope
- Returns empty glossary when no entries exist
- Handles hierarchical merge (project entries take priority over org entries)

Mock: `KnowledgeBaseEntriesQueries.getHierarchicalEntries`

- [ ] **Step 3: Run tests**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy && pnpm --filter web exec vitest run src/server/services/knowledge/__tests__/ --reporter=verbose`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add src/server/services/knowledge/__tests__/
git commit -m "test(knowledge): add boundary tests for ScopeGuard and KnowledgeModule (#591)"
```

---

## Phase 2: Migrate Callers

### Task 9: Migrate chat pipeline

**Files:**

- Modify: `src/server/services/chat/chat-pipeline.service.ts` (lines 37, 454, 492)
- Modify: `src/server/services/chat/chat-context.service.ts` (lines 14, 19, 142, 190)
- Modify: `src/server/services/chat/__tests__/chat-pipeline.service.test.ts` (lines ~143-149)

- [ ] **Step 1: Migrate chat-pipeline.service.ts**

Replace:

```typescript
import { KnowledgeBaseService } from "../knowledge-base.service";
```

With:

```typescript
import { KnowledgeModule } from "../knowledge";
```

Replace `resolveProjectContext` usage (line 454):

```typescript
// Before:
const knowledgeResult = await KnowledgeBaseService.buildKnowledgeContext(
  projectId,
  project.organizationId,
  caller.teamId ?? null,
);
if (knowledgeResult.isOk()) {
  knowledgeContext = knowledgeResult.value;
}

// After:
const knowledgeResult = await KnowledgeModule.getKnowledge({
  projectId,
  organizationId: project.organizationId,
  teamId: caller.teamId ?? null,
});
if (knowledgeResult.isOk()) {
  knowledgeContext = knowledgeResult.value.glossary;
}
```

Replace `resolveOrganizationContext` usage (line 492):

```typescript
// Before:
const knowledgeResult = await KnowledgeBaseService.buildKnowledgeContext(
  null,
  organizationId,
  caller.teamId ?? null,
);

// After:
const knowledgeResult = await KnowledgeModule.getKnowledge({
  organizationId,
  teamId: caller.teamId ?? null,
});
```

And update the value extraction: `knowledgeResult.value` → `knowledgeResult.value.glossary`

- [ ] **Step 2: Migrate chat-context.service.ts**

Replace:

```typescript
import { RAGService } from "../rag/rag.service";
// ...
const ragService = new RAGService();
```

With:

```typescript
import { SearchEngine } from "../knowledge/search-engine";
```

**Important**: `ChatContextService` needs the raw `SearchResult[]` type (not `SearchHit[]`) because it uses `SearchResultFormatter.limitResultsByTokens()` and `formatSourceCitations()` which depend on the full `SearchResult` metadata structure. Use `SearchEngine.searchRaw()` for this.

Replace `getRelevantContext` (line 142):

```typescript
// Before:
const searchResult = await ragService.search(query, "", {
  projectId,
  limit: 8,
  scoreThreshold: 0.6,
  useHybrid: true,
  useReranking: true,
  teamId: options?.teamId,
  userTeamIds: options?.userTeamIds,
});

// After:
const searchResult = await SearchEngine.searchRaw(
  query,
  {
    organizationId: "", // project-scoped search filters by projectId, not org
    projectId,
    teamId: options?.teamId,
    userTeamIds: options?.userTeamIds,
  },
  { limit: 8, scoreThreshold: 0.6, useHybrid: true, useReranking: true },
);
```

Replace `getRelevantContextOrganizationWide` (line 190):

```typescript
// Before:
const searchResult = await ragService.search(query, "", {
  organizationId,
  limit: 12,
  scoreThreshold: 0.6,
  useHybrid: false,
  useReranking: true,
  teamId: options?.teamId,
  userTeamIds: options?.userTeamIds,
});

// After:
const searchResult = await SearchEngine.searchRaw(
  query,
  {
    organizationId,
    teamId: options?.teamId,
    userTeamIds: options?.userTeamIds,
  },
  { limit: 12, scoreThreshold: 0.6, useHybrid: false, useReranking: true },
);
```

The rest of the function (`SearchResultFormatter.limitResultsByTokens`, `buildContextFromResults`, `formatSourceCitations`) remains unchanged since `searchRaw()` returns the same `SearchResult[]` type that `ragService.search()` returned.

- [ ] **Step 3: Update chat-pipeline test**

Replace mock of `KnowledgeBaseService` with mock of `KnowledgeModule`:

```typescript
vi.mock("../../knowledge", () => ({
  KnowledgeModule: {
    getKnowledge: vi.fn().mockResolvedValue(ok({ glossary: "", entries: [] })),
  },
}));
```

- [ ] **Step 4: Run tests**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy && pnpm --filter web exec vitest run src/server/services/chat/__tests__/ --reporter=verbose`
Expected: All tests pass

- [ ] **Step 5: Verify type check**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy && pnpm --filter web exec tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 6: Commit**

```bash
git add src/server/services/chat/ src/server/services/knowledge/
git commit -m "refactor(knowledge): migrate chat pipeline to KnowledgeModule (#591)"
```

---

### Task 10: Migrate AI services

**Files:**

- Modify: `src/server/services/summary.service.ts`
- Modify: `src/server/services/task-extraction.service.ts`
- Modify: `src/server/services/transcription.service.ts`

- [ ] **Step 1: Migrate all three AI services**

In each file, replace:

```typescript
import { KnowledgeBaseService } from "./knowledge-base.service";
// ...
const knowledgeResult = await KnowledgeBaseService.getApplicableKnowledge(
  projectId,
  organizationId,
  teamId,
);
```

With:

```typescript
import { KnowledgeModule } from "./knowledge";
// ...
const knowledgeResult = await KnowledgeModule.getKnowledge({
  projectId,
  organizationId,
  teamId,
});
```

And update value extraction: `knowledgeResult.value` (was `KnowledgeEntryDto[]`) becomes `knowledgeResult.value.entries` (the structured entries) or `knowledgeResult.value.glossary` (the pre-formatted string), depending on how each service uses the data. Read each service to determine which field to use.

- [ ] **Step 2: Verify type check**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy && pnpm --filter web exec tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 3: Commit**

```bash
git add src/server/services/summary.service.ts src/server/services/task-extraction.service.ts src/server/services/transcription.service.ts
git commit -m "refactor(knowledge): migrate AI services to KnowledgeModule (#591)"
```

---

### Task 11: Migrate server actions

**Files:**

- Modify: `src/features/knowledge-base/actions/create-entry.ts`
- Modify: `src/features/knowledge-base/actions/update-entry.ts`
- Modify: `src/features/knowledge-base/actions/delete-entry.ts`
- Modify: `src/features/knowledge-base/actions/upload-document.ts`
- Modify: `src/features/knowledge-base/actions/delete-document.ts`

- [ ] **Step 1: Migrate entry actions**

In each entry action, replace:

```typescript
import { KnowledgeBaseService } from "@/server/services/knowledge-base.service";
```

With:

```typescript
import { KnowledgeModule } from "@/server/services/knowledge";
```

Update method calls:

- `create-entry.ts`: `KnowledgeBaseService.createEntry(scope, scopeId, data, auth)` → `KnowledgeModule.createEntry({ scope, scopeId }, data, auth)`
- `update-entry.ts`: `KnowledgeBaseService.updateEntry(id, data, user.id, auth)` → `KnowledgeModule.updateEntry(id, data, auth)` (userId extracted from auth internally)
- `delete-entry.ts`: `KnowledgeBaseService.deleteEntry(id, user.id, auth)` → `KnowledgeModule.deleteEntry(id, auth)` (userId extracted from auth internally)

- [ ] **Step 2: Migrate document actions**

In each document action, replace:

```typescript
import { DocumentProcessingService } from "@/server/services/document-processing.service";
```

With:

```typescript
import { KnowledgeModule } from "@/server/services/knowledge";
```

Update method calls:

- `upload-document.ts`: `DocumentProcessingService.uploadDocument(file, scope, scopeId, meta, userId, auth)` → `KnowledgeModule.uploadDocument(file, { scope, scopeId }, meta, auth)`
- `upload-document.ts` (batch): `DocumentProcessingService.uploadDocumentsBatch(files, scope, scopeId, userId, auth)` → `KnowledgeModule.uploadDocumentsBatch(files, { scope, scopeId }, auth)`
- `delete-document.ts`: `DocumentProcessingService.deleteDocument(id, userId, auth)` → `KnowledgeModule.deleteDocument(id, auth)`

- [ ] **Step 3: Verify type check**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy && pnpm --filter web exec tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 4: Commit**

```bash
git add src/features/knowledge-base/actions/
git commit -m "refactor(knowledge): migrate server actions to KnowledgeModule (#591)"
```

---

### Task 12: Migrate cache layer

**Files:**

- Modify: `src/server/cache/knowledge-base.cache.ts`

- [ ] **Step 1: Replace KnowledgeBaseService import with direct query imports**

The cache layer calls `KnowledgeBaseService.getEntriesByScope()` and `getDocumentsByScope()` with `{ allowUnauthenticated: true }` since cache revalidation runs without auth context. The new `KnowledgeModule.listEntries()` requires `AuthContext`, which is unavailable during cache revalidation.

**Decision**: Replace the `KnowledgeBaseService` import with direct `KnowledgeBaseEntriesQueries` and `KnowledgeBaseDocumentsQueries` imports. The cache layer is a data access concern that bypasses business logic — it should call queries directly, not go through the module.

```typescript
// Before:
import { KnowledgeBaseService } from "../services/knowledge-base.service";
// KnowledgeBaseService.getEntriesByScope(scope, scopeId, { allowUnauthenticated: true })
// KnowledgeBaseService.getDocumentsByScope(scope, scopeId, { allowUnauthenticated: true })

// After:
import { KnowledgeBaseEntriesQueries } from "../data-access/knowledge-base-entries.queries";
import { KnowledgeBaseDocumentsQueries } from "../data-access/knowledge-base-documents.queries";
// KnowledgeBaseEntriesQueries.getEntriesByScope(scope, scopeId)
// KnowledgeBaseDocumentsQueries.getDocumentsByScope(scope, scopeId)
```

Check the existing cache file — it may already import the queries directly for `getCachedHierarchicalKnowledge`. If so, remove the `KnowledgeBaseService` import entirely and update the two function calls to use query classes directly.

- [ ] **Step 2: Verify type check**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy && pnpm --filter web exec tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 3: Commit**

```bash
git add src/server/cache/knowledge-base.cache.ts
git commit -m "refactor(knowledge): decouple cache layer from KnowledgeBaseService (#591)"
```

---

### Task 13: Migrate API routes

**Files:**

- Modify: `src/app/api/documents/[documentId]/view/route.ts`
- Modify: `src/app/api/agent/knowledge-base/route.ts`
- Modify: `src/app/api/agent/knowledge-base/preview/route.ts`
- Modify: `src/app/api/agent/knowledge-base/reindex/route.ts`

- [ ] **Step 1: Migrate document view route**

Replace `DocumentProcessingService.getDocumentForView` with `KnowledgeModule.getDocumentForView`.

- [ ] **Step 2: Migrate KB browser routes**

Replace `KnowledgeBaseBrowserService.listDocuments` with `KnowledgeModule.browseIndex`.
Replace `KnowledgeBaseBrowserService.getDocumentPreview` with `KnowledgeModule.getDocumentPreview`.
Replace `KnowledgeBaseBrowserService.reindexDocument` with `KnowledgeModule.reindexDocument`.

- [ ] **Step 3: Verify type check**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy && pnpm --filter web exec tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 4: Commit**

```bash
git add src/app/api/
git commit -m "refactor(knowledge): migrate API routes to KnowledgeModule (#591)"
```

---

### Task 14: Full verification

- [ ] **Step 1: Run full type check**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy && pnpm --filter web exec tsc --noEmit --pretty`
Expected: No errors

- [ ] **Step 2: Run linter**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy && pnpm --filter web lint`
Expected: No errors in modified files

- [ ] **Step 3: Run all tests**

Run: `cd /Users/nigeljanssens/Documents/projects/inovy && pnpm --filter web exec vitest run --reporter=verbose`
Expected: All tests pass

- [ ] **Step 4: Verify no remaining imports of old services in migrated files**

Run grep to check no migrated file still imports the old services:

```bash
grep -r "from.*knowledge-base\.service" src/features/knowledge-base/actions/ src/server/services/chat/ src/server/services/summary.service.ts src/server/services/task-extraction.service.ts src/server/services/transcription.service.ts src/app/api/agent/knowledge-base/ src/app/api/documents/
grep -r "from.*document-processing\.service" src/features/knowledge-base/actions/ src/app/api/documents/
grep -r "KnowledgeBaseBrowserService" src/app/api/agent/knowledge-base/
```

Expected: No matches in migrated files (cache layer and non-migrated files may still have old imports — that's OK).

- [ ] **Step 5: Commit if any fixes were needed**

---

## Phase 3: Cleanup (separate PR recommended)

### Task 15: Delete old services

Only after Phase 2 is merged and stable. This task should be a **separate branch/PR**.

**Files:**

- Delete: `src/server/services/knowledge-base.service.ts` (only if zero remaining imports)
- Delete: `src/server/services/document-processing.service.ts` (only if zero remaining imports)
- Delete: `src/server/services/knowledge-base-browser.service.ts` (only if zero remaining imports)
- Retain: `src/server/services/document.service.ts` (still used by `DocumentPipeline` internally)
- Retain: `src/server/services/embedding.service.ts` (still used by `EmbeddingGateway` and RAGService)
- Retain: `src/server/services/rag/` (still used for non-KB indexing: recordings, summaries, tasks)

- [ ] **Step 1: Verify no remaining imports**

```bash
grep -r "KnowledgeBaseService" src/ --include="*.ts" --include="*.tsx" | grep -v "__tests__" | grep -v "node_modules" | grep -v "knowledge/index.ts"
grep -r "DocumentProcessingService" src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules" | grep -v "knowledge/"
grep -r "KnowledgeBaseBrowserService" src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules" | grep -v "knowledge/"
```

If any imports remain, migrate them first before deleting.

- [ ] **Step 2: Delete old service files**

Only delete files with zero remaining external imports.

- [ ] **Step 3: Full verification**

Run type check, linter, and tests as in Task 14.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(knowledge): remove old KB/document-processing services (#591)"
```
