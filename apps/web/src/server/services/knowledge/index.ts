/**
 * KnowledgeModule — public facade for the knowledge subsystem.
 *
 * Wires ScopeGuard, DocumentPipeline, SearchEngine, and the data-access
 * layer into a single entry point. Every other module should import from
 * here instead of reaching into internal files.
 */

// ---------------------------------------------------------------------------
// 1. Type re-exports
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import type { AuthContext } from "@/lib/auth-context";
import { logger } from "@/lib/logger";
import {
  ActionErrors,
  type ActionResult,
} from "@/lib/server-action-client/action-errors";
import { err, ok } from "neverthrow";
import { KnowledgeBaseDocumentsQueries } from "@/server/data-access/knowledge-base-documents.queries";
import { KnowledgeBaseEntriesQueries } from "@/server/data-access/knowledge-base-entries.queries";
import type {
  CreateKnowledgeDocumentDto,
  CreateKnowledgeEntryDto,
} from "@/server/dto/knowledge-base.dto";
import type { KnowledgeBaseScope } from "@/server/db/schema/knowledge-base-entries";
import { getStorageProvider } from "@/server/services/storage";
import { DocumentService } from "@/server/services/document.service";
import { KnowledgeBaseBrowserService } from "@/server/services/knowledge-base-browser.service";
import { DocumentPipeline } from "./document-pipeline";
import { ScopeGuard } from "./scope-guard";
import { SearchEngine } from "./search-engine";
import type {
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
  KnowledgeDocumentDto,
  KnowledgeEntryDto,
} from "./types";
import type { ListDocumentsFilters } from "@/server/dto/knowledge-base-browser.dto";

const COMPONENT = "KnowledgeModule";

// ---------------------------------------------------------------------------
// 2. KnowledgeModule class
// ---------------------------------------------------------------------------

export class KnowledgeModule {
  // -------------------------------------------------------------------------
  // Hot-path methods (no AuthContext required)
  // -------------------------------------------------------------------------

  /**
   * Get knowledge glossary and structured entries for a scope.
   *
   * Returns hierarchical entries (team -> project -> organization -> global),
   * deduplicated by term, along with a pre-formatted glossary string ready
   * for AI prompt injection.
   */
  static async getKnowledge(
    scope: ScopeRef,
  ): Promise<ActionResult<KnowledgeContext>> {
    const context = `${COMPONENT}.getKnowledge`;

    try {
      const entries = await KnowledgeBaseEntriesQueries.getHierarchicalEntries(
        scope.projectId ?? null,
        scope.organizationId,
        scope.teamId,
      );

      // Strip priority field for the public DTO
      const strippedEntries: KnowledgeEntryDto[] = entries.map(
        ({ priority: _priority, ...entry }) => entry,
      );

      // Build glossary string
      const glossary = strippedEntries
        .map((entry) => {
          let formatted = `${entry.term}: ${entry.definition}`;
          if (entry.context) {
            formatted += ` (Context: ${entry.context})`;
          }
          if (entry.examples && entry.examples.length > 0) {
            formatted += ` (Examples: ${entry.examples.join(", ")})`;
          }
          return formatted;
        })
        .join("\n");

      return ok({ glossary, entries: strippedEntries });
    } catch (error) {
      logger.error(
        "Failed to get knowledge",
        { component: COMPONENT, scope },
        error as Error,
      );
      return err(
        ActionErrors.internal(
          "Failed to get knowledge",
          error as Error,
          context,
        ),
      );
    }
  }

  /**
   * Semantic search over the knowledge base.
   * Delegates to SearchEngine.
   */
  static async search(
    query: string,
    scope: ScopeRef,
    options?: SearchOptions,
  ): Promise<ActionResult<SearchHit[]>> {
    return SearchEngine.search(query, scope, options);
  }

  // -------------------------------------------------------------------------
  // Entry CRUD methods (require AuthContext)
  // -------------------------------------------------------------------------

  /**
   * List entries for a specific scope.
   */
  static async listEntries(
    target: ScopeTarget,
    auth: AuthContext,
    options?: { includeInactive?: boolean },
  ): Promise<ActionResult<KnowledgeEntryDto[]>> {
    const context = `${COMPONENT}.listEntries`;

    try {
      const guardResult = await ScopeGuard.validate(
        target.scope,
        target.scopeId,
        auth.user.id,
        "read",
        auth,
        context,
      );
      if (guardResult.isErr()) {
        return err(guardResult.error);
      }

      const entries = await KnowledgeBaseEntriesQueries.getEntriesByScope(
        target.scope,
        target.scopeId,
        options,
      );

      return ok(entries);
    } catch (error) {
      logger.error(
        "Failed to list entries",
        { component: COMPONENT, target },
        error as Error,
      );
      return err(
        ActionErrors.internal(
          "Failed to list entries",
          error as Error,
          context,
        ),
      );
    }
  }

  /**
   * Search entries by term/definition within a scope.
   */
  static async searchEntries(
    target: ScopeTarget,
    searchTerm: string,
    auth: AuthContext,
  ): Promise<ActionResult<KnowledgeEntryDto[]>> {
    const context = `${COMPONENT}.searchEntries`;

    try {
      if (!searchTerm || searchTerm.trim().length === 0) {
        return err(ActionErrors.badRequest("Search term is required", context));
      }

      const guardResult = await ScopeGuard.validate(
        target.scope,
        target.scopeId,
        auth.user.id,
        "read",
        auth,
        context,
      );
      if (guardResult.isErr()) {
        return err(guardResult.error);
      }

      const entries = await KnowledgeBaseEntriesQueries.searchEntries(
        target.scope,
        target.scopeId,
        searchTerm.trim(),
      );

      return ok(entries);
    } catch (error) {
      logger.error(
        "Failed to search entries",
        { component: COMPONENT, target, searchTerm },
        error as Error,
      );
      return err(
        ActionErrors.internal(
          "Failed to search entries",
          error as Error,
          context,
        ),
      );
    }
  }

  /**
   * Create a knowledge base entry with permission validation.
   */
  static async createEntry(
    target: ScopeTarget,
    data: EntryInput,
    auth: AuthContext,
  ): Promise<ActionResult<KnowledgeEntryDto>> {
    const context = `${COMPONENT}.createEntry`;
    const userId = auth.user.id;

    try {
      const guardResult = await ScopeGuard.validate(
        target.scope,
        target.scopeId,
        userId,
        "write",
        auth,
        context,
      );
      if (guardResult.isErr()) {
        return err(
          ActionErrors.forbidden(
            "You are not authorized to create a knowledge base entry in this scope",
            { scope: target.scope, scopeId: target.scopeId, userId },
            context,
          ),
        );
      }

      // Normalize term before duplicate check and storage
      const normalizedTerm = data.term.trim();

      // Check duplicate term within scope
      const existingEntries =
        await KnowledgeBaseEntriesQueries.getEntriesByScope(
          target.scope,
          target.scopeId,
          { includeInactive: true },
        );
      const duplicate = existingEntries.find(
        (e) => e.term.toLowerCase() === normalizedTerm.toLowerCase(),
      );
      if (duplicate) {
        return err(
          ActionErrors.conflict(
            `Term "${normalizedTerm}" already exists in this scope`,
            context,
          ),
        );
      }

      const createDto: CreateKnowledgeEntryDto = {
        scope: target.scope,
        scopeId: target.scopeId,
        term: normalizedTerm,
        definition: data.definition.trim(),
        context: data.context?.trim() ?? null,
        examples: data.examples ?? null,
        boost: data.boost ?? null,
        category: data.category ?? "custom",
        createdById: userId,
      };

      const entry = await KnowledgeBaseEntriesQueries.createEntry(createDto);

      logger.info("Knowledge base entry created", {
        component: COMPONENT,
        entryId: entry.id,
        scope: target.scope,
        scopeId: target.scopeId,
        term: entry.term,
        userId,
      });

      return ok(entry);
    } catch (error) {
      logger.error(
        "Failed to create knowledge base entry",
        { component: COMPONENT, target, data },
        error as Error,
      );
      return err(
        ActionErrors.internal(
          "Failed to create knowledge base entry",
          error as Error,
          context,
        ),
      );
    }
  }

  /**
   * Bulk create knowledge base entries with permission validation.
   * Used for CSV/TXT import. Skips duplicates.
   */
  static async bulkCreateEntries(
    target: ScopeTarget,
    entries: EntryInput[],
    auth: AuthContext,
  ): Promise<ActionResult<{ imported: KnowledgeEntryDto[]; skipped: number }>> {
    const context = `${COMPONENT}.bulkCreateEntries`;
    const userId = auth.user.id;

    try {
      const guardResult = await ScopeGuard.validate(
        target.scope,
        target.scopeId,
        userId,
        "write",
        auth,
        context,
      );
      if (guardResult.isErr()) {
        return err(
          ActionErrors.forbidden(
            "You are not authorized to import entries in this scope",
            { scope: target.scope, scopeId: target.scopeId, userId },
            context,
          ),
        );
      }

      // Fetch existing entries to check for duplicates
      const existingEntries =
        await KnowledgeBaseEntriesQueries.getEntriesByScope(
          target.scope,
          target.scopeId,
          { includeInactive: true },
        );
      const existingTerms = new Set(
        existingEntries.map((e) => e.term.toLowerCase()),
      );

      // Filter out duplicates
      const newEntries: EntryInput[] = [];
      let skipped = 0;
      for (const entry of entries) {
        const normalizedTerm = entry.term.trim().toLowerCase();
        if (existingTerms.has(normalizedTerm)) {
          skipped++;
        } else {
          newEntries.push(entry);
          existingTerms.add(normalizedTerm); // Prevent intra-batch duplicates
        }
      }

      if (newEntries.length === 0) {
        return ok({ imported: [], skipped });
      }

      // Build DTOs
      const dtos = newEntries.map((entry) => ({
        scope: target.scope,
        scopeId: target.scopeId,
        term: entry.term.trim(),
        definition: entry.definition.trim(),
        context: entry.context?.trim() || null,
        examples: entry.examples ?? null,
        boost: entry.boost ?? null,
        category: entry.category ?? ("custom" as const),
        createdById: userId,
      }));

      const imported =
        await KnowledgeBaseEntriesQueries.bulkCreateEntries(dtos);

      logger.info("Bulk imported knowledge entries", {
        component: context,
        scope: target.scope,
        scopeId: target.scopeId,
        imported: imported.length,
        skipped,
      });

      return ok({ imported, skipped });
    } catch (error) {
      logger.error(
        "Failed to bulk create entries",
        { component: context, target, count: entries.length },
        error as Error,
      );
      return err(
        ActionErrors.internal(
          "Failed to import entries",
          error as Error,
          context,
        ),
      );
    }
  }

  /**
   * Update a knowledge base entry with permission validation.
   * userId is extracted from auth.user.id.
   */
  static async updateEntry(
    entryId: string,
    data: UpdateEntryInput,
    auth: AuthContext,
  ): Promise<ActionResult<KnowledgeEntryDto>> {
    const context = `${COMPONENT}.updateEntry`;
    const userId = auth.user.id;

    try {
      // Get existing entry
      const existing = await KnowledgeBaseEntriesQueries.getEntryById(entryId);
      if (!existing) {
        return err(ActionErrors.notFound("Knowledge base entry", context));
      }

      // Validate scope permissions
      const guardResult = await ScopeGuard.validate(
        existing.scope,
        existing.scopeId,
        userId,
        "write",
        auth,
        context,
      );
      if (guardResult.isErr()) {
        return err(
          ActionErrors.forbidden(
            "You are not authorized to update a knowledge base entry in this scope",
            {
              scope: existing.scope,
              scopeId: existing.scopeId,
              userId,
            },
            context,
          ),
        );
      }

      // If term is being changed, normalize and check for duplicates
      const normalizedTerm = data.term?.trim();
      if (normalizedTerm) {
        const existingEntries =
          await KnowledgeBaseEntriesQueries.getEntriesByScope(
            existing.scope,
            existing.scopeId,
            { includeInactive: true },
          );
        const duplicate = existingEntries.find(
          (e) =>
            e.id !== entryId &&
            e.term.toLowerCase() === normalizedTerm.toLowerCase(),
        );
        if (duplicate) {
          return err(
            ActionErrors.conflict(
              `Term "${normalizedTerm}" already exists in this scope`,
              context,
            ),
          );
        }
      }

      // Build update payload — only include fields that were provided
      const updatePayload: Record<string, unknown> = {};
      if (normalizedTerm !== undefined) updatePayload.term = normalizedTerm;
      if (data.definition !== undefined)
        updatePayload.definition = data.definition.trim();
      if ("context" in data)
        updatePayload.context = data.context?.trim() ?? null;
      if (data.examples !== undefined) updatePayload.examples = data.examples;
      if (data.isActive !== undefined) updatePayload.isActive = data.isActive;

      const updated = await KnowledgeBaseEntriesQueries.updateEntry(
        entryId,
        updatePayload,
      );

      if (!updated) {
        return err(ActionErrors.notFound("Knowledge base entry", context));
      }

      logger.info("Knowledge base entry updated", {
        component: COMPONENT,
        entryId,
        scope: existing.scope,
        scopeId: existing.scopeId,
        userId,
      });

      return ok(updated);
    } catch (error) {
      logger.error(
        "Failed to update knowledge base entry",
        { component: COMPONENT, entryId },
        error as Error,
      );
      return err(
        ActionErrors.internal(
          "Failed to update knowledge base entry",
          error as Error,
          context,
        ),
      );
    }
  }

  /**
   * Soft-delete a knowledge base entry.
   * userId is extracted from auth.user.id.
   */
  static async deleteEntry(
    entryId: string,
    auth: AuthContext,
  ): Promise<ActionResult<void>> {
    const context = `${COMPONENT}.deleteEntry`;
    const userId = auth.user.id;

    try {
      const existing = await KnowledgeBaseEntriesQueries.getEntryById(entryId);
      if (!existing) {
        return err(ActionErrors.notFound("Knowledge base entry", context));
      }

      const guardResult = await ScopeGuard.validate(
        existing.scope,
        existing.scopeId,
        userId,
        "write",
        auth,
        context,
      );
      if (guardResult.isErr()) {
        return err(guardResult.error);
      }

      const deleted = await KnowledgeBaseEntriesQueries.deleteEntry(entryId);
      if (!deleted) {
        return err(ActionErrors.notFound("Knowledge base entry", context));
      }

      logger.info("Knowledge base entry deleted", {
        component: COMPONENT,
        entryId,
        scope: existing.scope,
        scopeId: existing.scopeId,
        userId,
      });

      return ok(undefined);
    } catch (error) {
      logger.error(
        "Failed to delete knowledge base entry",
        { component: COMPONENT, entryId },
        error as Error,
      );
      return err(
        ActionErrors.internal(
          "Failed to delete knowledge base entry",
          error as Error,
          context,
        ),
      );
    }
  }

  /**
   * Promote an entry to a higher scope.
   * userId is extracted from auth.user.id.
   */
  static async promoteEntry(
    entryId: string,
    toScope: KnowledgeBaseScope,
    auth: AuthContext,
  ): Promise<ActionResult<KnowledgeEntryDto>> {
    const context = `${COMPONENT}.promoteEntry`;
    const userId = auth.user.id;

    try {
      const existing = await KnowledgeBaseEntriesQueries.getEntryById(entryId);
      if (!existing) {
        return err(ActionErrors.notFound("Knowledge base entry", context));
      }

      // Validate read access on source
      const sourceGuardResult = await ScopeGuard.validate(
        existing.scope,
        existing.scopeId,
        userId,
        "read",
        auth,
        context,
      );
      if (sourceGuardResult.isErr()) {
        return err(sourceGuardResult.error);
      }

      // Validate promotion is to a higher scope
      const scopeOrder: Record<KnowledgeBaseScope, number> = {
        project: 1,
        team: 2,
        organization: 3,
        global: 4,
      };
      if (scopeOrder[toScope] <= scopeOrder[existing.scope]) {
        return err(
          ActionErrors.badRequest(
            `Cannot promote entry from ${existing.scope} to ${toScope}. Promotion must be to a higher scope.`,
            context,
          ),
        );
      }

      // Reject project promotion (no way to specify target projectId)
      if (toScope === "project") {
        return err(
          ActionErrors.badRequest(
            "Project promotion requires explicit projectId",
            context,
          ),
        );
      }

      // Resolve target scopeId based on the destination scope
      const targetScopeId =
        toScope === "global"
          ? null
          : toScope === "organization"
            ? auth.organizationId
            : toScope === "team"
              ? existing.scopeId // team-to-team promotion preserves team
              : null;

      // Validate write access on target scope
      const targetGuardResult = await ScopeGuard.validate(
        toScope,
        targetScopeId,
        userId,
        "write",
        auth,
        context,
      );
      if (targetGuardResult.isErr()) {
        return err(
          ActionErrors.forbidden(
            "You are not authorized to promote a knowledge base entry in this scope",
            { scope: toScope, scopeId: targetScopeId, userId },
            context,
          ),
        );
      }

      // Check for duplicate in target scope
      const existingInTarget =
        await KnowledgeBaseEntriesQueries.getEntriesByScope(
          toScope,
          targetScopeId,
          { includeInactive: true },
        );
      const duplicate = existingInTarget.find(
        (e) => e.term.toLowerCase() === existing.term.toLowerCase(),
      );
      if (duplicate) {
        return err(
          ActionErrors.conflict(
            `Term "${existing.term}" already exists in ${toScope} scope`,
            context,
          ),
        );
      }

      // Create entry in target scope
      const createDto: CreateKnowledgeEntryDto = {
        scope: toScope,
        scopeId: targetScopeId,
        term: existing.term,
        definition: existing.definition,
        context: existing.context,
        examples: existing.examples,
        createdById: userId,
      };

      const promoted = await KnowledgeBaseEntriesQueries.createEntry(createDto);

      logger.info("Knowledge base entry promoted", {
        component: COMPONENT,
        entryId,
        fromScope: existing.scope,
        toScope,
        userId,
      });

      return ok(promoted);
    } catch (error) {
      logger.error(
        "Failed to promote knowledge base entry",
        { component: COMPONENT, entryId, toScope },
        error as Error,
      );
      return err(
        ActionErrors.internal(
          "Failed to promote knowledge base entry",
          error as Error,
          context,
        ),
      );
    }
  }

  // -------------------------------------------------------------------------
  // Document methods (require AuthContext)
  // -------------------------------------------------------------------------

  /**
   * Upload a single document, store in blob, create DB record, and kick off
   * async processing via DocumentPipeline.
   */
  static async uploadDocument(
    file: File,
    target: ScopeTarget,
    metadata: DocumentMetadataInput,
    auth: AuthContext,
  ): Promise<ActionResult<DocumentUploadResult>> {
    const context = `${COMPONENT}.uploadDocument`;
    const userId = auth.user.id;

    try {
      // Validate file
      const fileValidation = DocumentPipeline.validateFile(file);
      if (fileValidation.isErr()) {
        return err(fileValidation.error);
      }

      // Validate scope permissions
      const guardResult = await ScopeGuard.validate(
        target.scope,
        target.scopeId,
        userId,
        "write",
        auth,
        context,
      );
      if (guardResult.isErr()) {
        return err(
          ActionErrors.forbidden(
            "You are not authorized to upload a document to this scope",
            { scope: target.scope, scopeId: target.scopeId, userId },
            context,
          ),
        );
      }

      // Upload to blob storage
      const storage = await getStorageProvider();
      const blobPath = `knowledge-base/${target.scope}/${target.scopeId ?? "global"}/${file.name}`;
      const blobResult = await storage.put(blobPath, file, {
        access: "public",
        addRandomSuffix: true,
      });

      // Create DB record — clean up blob on failure
      let document;
      try {
        const createDto: CreateKnowledgeDocumentDto = {
          scope: target.scope,
          scopeId: target.scopeId,
          title: metadata.title.trim(),
          description: metadata.description?.trim() ?? null,
          fileUrl: blobResult.url,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          createdById: userId,
        };

        document =
          await KnowledgeBaseDocumentsQueries.createDocument(createDto);
      } catch (dbError) {
        // Compensate: delete orphaned blob
        try {
          await storage.del(blobResult.url);
        } catch (cleanupError) {
          logger.warn("Failed to clean up blob after DB write failure", {
            component: COMPONENT,
            blobUrl: blobResult.url,
            error:
              cleanupError instanceof Error
                ? cleanupError.message
                : String(cleanupError),
          });
        }
        throw dbError;
      }

      logger.info("Document uploaded to knowledge base", {
        component: COMPONENT,
        documentId: document.id,
        scope: target.scope,
        scopeId: target.scopeId,
        fileName: file.name,
        userId,
      });

      // Kick off processing asynchronously
      DocumentPipeline.processDocument(document.id, auth).catch((error) => {
        logger.error(
          "Failed to process document",
          { component: COMPONENT, documentId: document.id },
          error as Error,
        );
      });

      return ok({ document, processingStatus: "pending" as const });
    } catch (error) {
      logger.error(
        "Failed to upload document",
        {
          component: COMPONENT,
          scope: target.scope,
          scopeId: target.scopeId,
          fileName: file.name,
        },
        error as Error,
      );
      return err(
        ActionErrors.internal(
          "Failed to upload document",
          error as Error,
          context,
        ),
      );
    }
  }

  /**
   * Upload multiple documents in batch.
   * Validates files upfront, uploads valid ones in parallel, kicks off
   * processing for each via DocumentPipeline.
   */
  static async uploadDocumentsBatch(
    files: DocumentBatchInput[],
    target: ScopeTarget,
    auth: AuthContext,
  ): Promise<ActionResult<BatchUploadResult[]>> {
    const context = `${COMPONENT}.uploadDocumentsBatch`;
    const userId = auth.user.id;

    try {
      // Validate scope permissions once for the whole batch
      const guardResult = await ScopeGuard.validate(
        target.scope,
        target.scopeId,
        userId,
        "write",
        auth,
        context,
      );
      if (guardResult.isErr()) {
        return err(
          ActionErrors.forbidden(
            "You are not authorized to upload documents to this scope",
            { scope: target.scope, scopeId: target.scopeId, userId },
            context,
          ),
        );
      }

      // Validate all files upfront — track original indices for correct result ordering
      const validFiles: Array<{ item: DocumentBatchInput; index: number }> = [];
      const resultMap = new Map<number, BatchUploadResult>();

      for (let i = 0; i < files.length; i++) {
        const item = files[i]!;
        const fileValidation = DocumentPipeline.validateFile(item.file);
        if (fileValidation.isErr()) {
          resultMap.set(i, {
            success: false,
            fileName: item.file.name,
            error: fileValidation.error.message,
          });
        } else {
          validFiles.push({ item, index: i });
        }
      }

      // Early return if no valid files
      if (validFiles.length === 0) {
        return ok(files.map((_, i) => resultMap.get(i)!));
      }

      // Upload valid files in parallel
      const uploadPromises = validFiles.map(async ({ item, index }) => {
        try {
          const blobPath = `knowledge-base/${target.scope}/${target.scopeId ?? "global"}/${item.file.name}`;
          const storage = await getStorageProvider();
          const blobResult = await storage.put(blobPath, item.file, {
            access: "public",
            addRandomSuffix: true,
          });

          const createDto: CreateKnowledgeDocumentDto = {
            scope: target.scope,
            scopeId: target.scopeId,
            title: item.title.trim(),
            description: item.description?.trim() ?? null,
            fileUrl: blobResult.url,
            fileName: item.file.name,
            fileSize: item.file.size,
            fileType: item.file.type,
            createdById: userId,
          };

          const document =
            await KnowledgeBaseDocumentsQueries.createDocument(createDto);

          logger.info("Document uploaded to knowledge base (batch)", {
            component: COMPONENT,
            documentId: document.id,
            scope: target.scope,
            scopeId: target.scopeId,
            fileName: item.file.name,
            userId,
          });

          // Kick off processing asynchronously
          DocumentPipeline.processDocument(document.id, auth).catch((error) => {
            logger.error(
              "Failed to process document",
              { component: COMPONENT, documentId: document.id },
              error as Error,
            );
          });

          resultMap.set(index, {
            success: true as const,
            document,
            fileName: item.file.name,
          });
          return { index };
        } catch (error) {
          logger.error(
            "Failed to upload document in batch",
            {
              component: COMPONENT,
              scope: target.scope,
              scopeId: target.scopeId,
              fileName: item.file.name,
            },
            error as Error,
          );
          resultMap.set(index, {
            success: false as const,
            fileName: item.file.name,
            error:
              error instanceof Error
                ? error.message
                : "Failed to upload document",
          });
          return { index };
        }
      });

      await Promise.allSettled(uploadPromises);

      // Reconstruct results in original file order
      const allResults: BatchUploadResult[] = files.map((item, index) => {
        const result = resultMap.get(index);
        if (result) {
          return result;
        }
        return {
          success: false,
          fileName: item.file.name,
          error: "Result not found",
        };
      });

      const successfulCount = allResults.filter((r) => r.success).length;
      const failedCount = allResults.filter((r) => !r.success).length;

      logger.info("Batch document upload completed", {
        component: COMPONENT,
        scope: target.scope,
        scopeId: target.scopeId,
        totalFiles: files.length,
        validFiles: validFiles.length,
        validationErrors: files.length - validFiles.length,
        successful: successfulCount,
        failed: failedCount,
        userId,
      });

      return ok(allResults);
    } catch (error) {
      logger.error(
        "Failed to upload documents batch",
        {
          component: COMPONENT,
          scope: target.scope,
          scopeId: target.scopeId,
          fileCount: files.length,
        },
        error as Error,
      );
      return err(
        ActionErrors.internal(
          "Failed to upload documents batch",
          error as Error,
          context,
        ),
      );
    }
  }

  /**
   * Delete a document: validate access, remove Qdrant vectors, delete DB record.
   * userId is extracted from auth.user.id.
   */
  static async deleteDocument(
    documentId: string,
    auth: AuthContext,
  ): Promise<ActionResult<void>> {
    const context = `${COMPONENT}.deleteDocument`;
    const userId = auth.user.id;

    try {
      // Get document
      const document =
        await KnowledgeBaseDocumentsQueries.getDocumentById(documentId);
      if (!document) {
        return err(ActionErrors.notFound("Document", context));
      }

      // Validate document access
      const accessResult = await ScopeGuard.validateDocumentAccess(
        document,
        auth,
        context,
      );
      if (accessResult.isErr()) {
        return err(accessResult.error);
      }

      // Validate write permissions on the document's scope
      const guardResult = await ScopeGuard.validate(
        document.scope,
        document.scopeId,
        userId,
        "write",
        auth,
        context,
      );
      if (guardResult.isErr()) {
        return err(
          ActionErrors.forbidden(
            "You are not authorized to delete a document from this scope",
            {
              scope: document.scope,
              scopeId: document.scopeId,
              userId,
            },
            context,
          ),
        );
      }

      // Delete Qdrant vectors (best-effort)
      const deleteChunksResult =
        await DocumentService.Processing.deleteDocumentChunks(
          documentId,
          auth.organizationId,
        );
      if (deleteChunksResult.isErr()) {
        logger.warn("Failed to delete document chunks from Qdrant", {
          component: COMPONENT,
          documentId,
          error: deleteChunksResult.error,
        });
        // Continue with database deletion even if Qdrant deletion fails
      }

      // Delete from Blob storage (best-effort)
      try {
        logger.info("Document blob deletion skipped (requires blob path)", {
          component: COMPONENT,
          documentId,
          fileUrl: document.fileUrl,
        });
      } catch (error) {
        logger.warn("Failed to delete document from blob", {
          component: COMPONENT,
          documentId,
          error,
        });
      }

      // Delete DB record
      const deleted =
        await KnowledgeBaseDocumentsQueries.deleteDocument(documentId);
      if (!deleted) {
        return err(ActionErrors.notFound("Document", context));
      }

      logger.info("Document deleted", {
        component: COMPONENT,
        documentId,
        userId,
      });

      return ok(undefined);
    } catch (error) {
      logger.error(
        "Failed to delete document",
        { component: COMPONENT, documentId },
        error as Error,
      );
      return err(
        ActionErrors.internal(
          "Failed to delete document",
          error as Error,
          context,
        ),
      );
    }
  }

  /**
   * Re-index a document: delete existing Qdrant vectors and re-process.
   */
  static async reindexDocument(
    documentId: string,
    auth: AuthContext,
  ): Promise<ActionResult<void>> {
    const context = `${COMPONENT}.reindexDocument`;

    try {
      // Get document
      const document =
        await KnowledgeBaseDocumentsQueries.getDocumentById(documentId);
      if (!document) {
        return err(ActionErrors.notFound("Document", context));
      }

      // Validate document access
      const accessResult = await ScopeGuard.validateDocumentAccess(
        document,
        auth,
        context,
      );
      if (accessResult.isErr()) {
        return err(accessResult.error);
      }

      // Delete existing Qdrant vectors
      const deleteChunksResult =
        await DocumentService.Processing.deleteDocumentChunks(
          documentId,
          auth.organizationId,
        );
      if (deleteChunksResult.isErr()) {
        logger.warn(
          "Failed to delete existing document chunks before re-index",
          {
            component: COMPONENT,
            documentId,
            error: deleteChunksResult.error,
          },
        );
        // Continue with re-processing even if old vector deletion fails
      }

      // Re-process document
      const processResult = await DocumentPipeline.processDocument(
        documentId,
        auth,
      );
      if (processResult.isErr()) {
        return err(processResult.error);
      }

      logger.info("Document re-indexing triggered", {
        component: COMPONENT,
        documentId,
      });

      return ok(undefined);
    } catch (error) {
      logger.error(
        "Failed to re-index document",
        { component: COMPONENT, documentId },
        error as Error,
      );
      return err(
        ActionErrors.internal(
          "Failed to re-index document",
          error as Error,
          context,
        ),
      );
    }
  }

  /**
   * Get document extracted text content.
   */
  static async getDocumentContent(
    documentId: string,
    auth: AuthContext,
  ): Promise<ActionResult<string>> {
    const context = `${COMPONENT}.getDocumentContent`;

    try {
      const document =
        await KnowledgeBaseDocumentsQueries.getDocumentById(documentId);
      if (!document) {
        return err(ActionErrors.notFound("Document", context));
      }

      // Validate document access
      const accessResult = await ScopeGuard.validateDocumentAccess(
        document,
        auth,
        context,
      );
      if (accessResult.isErr()) {
        return err(accessResult.error);
      }

      if (!document.extractedText) {
        return err(
          ActionErrors.badRequest("Document text not yet extracted", context),
        );
      }

      return ok(document.extractedText);
    } catch (error) {
      logger.error(
        "Failed to get document content",
        { component: COMPONENT, documentId },
        error as Error,
      );
      return err(
        ActionErrors.internal(
          "Failed to get document content",
          error as Error,
          context,
        ),
      );
    }
  }

  /**
   * Get a document for view/download with access validation.
   */
  static async getDocumentForView(
    documentId: string,
    auth: AuthContext,
  ): Promise<ActionResult<KnowledgeDocumentDto>> {
    const context = `${COMPONENT}.getDocumentForView`;

    try {
      const document =
        await KnowledgeBaseDocumentsQueries.getDocumentById(documentId);
      if (!document) {
        return err(ActionErrors.notFound("Document", context));
      }

      const accessResult = await ScopeGuard.validateDocumentAccess(
        document,
        auth,
        context,
      );
      if (accessResult.isErr()) {
        return err(accessResult.error);
      }

      return ok(document);
    } catch (error) {
      logger.error(
        "Failed to get document for view",
        { component: COMPONENT, documentId },
        error as Error,
      );
      return err(
        ActionErrors.internal(
          "Failed to get document for view",
          error as Error,
          context,
        ),
      );
    }
  }

  /**
   * Extract term suggestions from a processed document.
   * Finds abbreviations (2-5 uppercase chars) occurring 2+ times.
   */
  static async extractTermSuggestions(
    documentId: string,
    auth: AuthContext,
  ): Promise<ActionResult<string[]>> {
    const context = `${COMPONENT}.extractTermSuggestions`;

    try {
      const contentResult = await this.getDocumentContent(documentId, auth);
      if (contentResult.isErr()) {
        return err(contentResult.error);
      }

      const text = contentResult.value;

      // Find potential abbreviations (2-5 uppercase chars)
      const abbreviationPattern = /\b[A-Z]{2,5}\b/g;
      const matches = text.match(abbreviationPattern) ?? [];

      // Filter common words
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
          termCounts.set(match, (termCounts.get(match) ?? 0) + 1);
        }
      }

      // Return terms appearing 2+ times, max 20
      const suggestedTerms = Array.from(termCounts.entries())
        .filter(([, count]) => count >= 2)
        .map(([term]) => term)
        .slice(0, 20);

      return ok(suggestedTerms);
    } catch (error) {
      logger.error(
        "Failed to extract terms from document",
        { component: COMPONENT, documentId },
        error as Error,
      );
      return err(
        ActionErrors.internal(
          "Failed to extract terms from document",
          error as Error,
          context,
        ),
      );
    }
  }

  // -------------------------------------------------------------------------
  // Admin / browse methods (Phase 1: delegate to existing services)
  // -------------------------------------------------------------------------

  /**
   * Browse indexed documents. Delegates to KnowledgeBaseBrowserService.
   */
  static async browseIndex(
    auth: AuthContext,
    filters: BrowseFilters,
  ): Promise<ActionResult<BrowseResult>> {
    const listFilters: ListDocumentsFilters = {
      organizationId: auth.organizationId,
      projectId: filters.projectId,
      contentType: filters.contentType,
      search: filters.search,
      limit: filters.limit,
      offset: filters.offset,
    };

    return KnowledgeBaseBrowserService.listDocuments(auth, listFilters);
  }

  /**
   * Get document preview with sample chunks.
   * Delegates to KnowledgeBaseBrowserService.
   */
  static async getDocumentPreview(
    documentId: string,
    auth: AuthContext,
    sampleSize?: number,
  ): Promise<ActionResult<DocumentPreview>> {
    return KnowledgeBaseBrowserService.getDocumentPreview(
      auth,
      documentId,
      auth.organizationId,
      sampleSize,
    );
  }
}
