import { ActionErrors, type ActionResult } from "@/lib";
import { getAuthSession } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { ROLES } from "@/lib/rbac";
import { err, ok } from "neverthrow";
import {
  KnowledgeBaseDocumentsQueries,
  KnowledgeBaseEntriesQueries,
  ProjectQueries,
} from "../data-access";
import type { KnowledgeBaseScope } from "../db/schema/knowledge-base-entries";
import type {
  CreateKnowledgeDocumentDto,
  CreateKnowledgeEntryDto,
  KnowledgeDocumentDto,
  KnowledgeEntryDto,
  UpdateKnowledgeEntryDto,
} from "../dto/knowledge-base.dto";

/**
 * Business logic layer for Knowledge Base operations
 * Orchestrates data access and handles business rules, permissions, and scope validation
 */
export class KnowledgeBaseService {
  /**
   * Get applicable knowledge for a project (hierarchical: project → organization → global)
   * Returns entries with priority ordering, deduplicated by term
   */
  static async getApplicableKnowledge(
    projectId: string | null,
    organizationId: string | null
  ): Promise<ActionResult<KnowledgeEntryDto[]>> {
    try {
      if (!projectId || !organizationId) {
        return ok([]);
      }

      const entries = await KnowledgeBaseEntriesQueries.getHierarchicalEntries(
        projectId,
        organizationId
      );

      // Remove priority field for return type
      const result: KnowledgeEntryDto[] = entries.map(
        ({ priority, ...entry }) => entry
      );

      return ok(result);
    } catch (error) {
      logger.error(
        "Failed to get applicable knowledge",
        { projectId, organizationId },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to get applicable knowledge",
          error as Error,
          "KnowledgeBaseService.getApplicableKnowledge"
        )
      );
    }
  }

  /**
   * Get entries for a specific scope only
   */
  static async getEntriesByScope(
    scope: KnowledgeBaseScope,
    scopeId: string | null,
    options?: { includeInactive?: boolean }
  ): Promise<ActionResult<KnowledgeEntryDto[]>> {
    try {
      const entries = await KnowledgeBaseEntriesQueries.getEntriesByScope(
        scope,
        scopeId,
        options
      );

      return ok(entries);
    } catch (error) {
      logger.error(
        "Failed to get entries by scope",
        { scope, scopeId },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to get entries by scope",
          error as Error,
          "KnowledgeBaseService.getEntriesByScope"
        )
      );
    }
  }

  /**
   * Search knowledge entries within a scope
   */
  static async searchKnowledge(
    scope: KnowledgeBaseScope,
    scopeId: string | null,
    searchTerm: string
  ): Promise<ActionResult<KnowledgeEntryDto[]>> {
    try {
      if (!searchTerm || searchTerm.trim().length === 0) {
        return err(
          ActionErrors.badRequest(
            "Search term is required",
            "KnowledgeBaseService.searchKnowledge"
          )
        );
      }

      const entries = await KnowledgeBaseEntriesQueries.searchEntries(
        scope,
        scopeId,
        searchTerm.trim()
      );

      return ok(entries);
    } catch (error) {
      logger.error(
        "Failed to search knowledge",
        { scope, scopeId, searchTerm },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to search knowledge",
          error as Error,
          "KnowledgeBaseService.searchKnowledge"
        )
      );
    }
  }

  /**
   * Create a knowledge base entry with permission validation
   */
  static async createEntry(
    scope: KnowledgeBaseScope,
    scopeId: string | null,
    entryData: {
      term: string;
      definition: string;
      context?: string | null;
      examples?: string[] | null;
    },
    userId: string
  ): Promise<ActionResult<KnowledgeEntryDto>> {
    try {
      // Validate scope-specific permissions
      const permissionResult = await this.validateScopePermissions(
        scope,
        scopeId,
        userId,
        "write"
      );
      if (permissionResult.isErr()) {
        return err(
          ActionErrors.forbidden(
            "You are not authorized to create a knowledge base entry in this scope",
            {
              scope,
              scopeId,
              userId,
            },
            "KnowledgeBaseService.createEntry"
          )
        );
      }

      // Validate term uniqueness within scope
      const existingEntries =
        await KnowledgeBaseEntriesQueries.getEntriesByScope(scope, scopeId, {
          includeInactive: true,
        });
      const duplicate = existingEntries.find(
        (e) => e.term.toLowerCase() === entryData.term.toLowerCase()
      );
      if (duplicate) {
        return err(
          ActionErrors.conflict(
            `Term "${entryData.term}" already exists in this scope`,
            "KnowledgeBaseService.createEntry"
          )
        );
      }

      const createDto: CreateKnowledgeEntryDto = {
        scope,
        scopeId,
        term: entryData.term.trim(),
        definition: entryData.definition.trim(),
        context: entryData.context?.trim() ?? null,
        examples: entryData.examples ?? null,
        createdById: userId,
      };

      const entry = await KnowledgeBaseEntriesQueries.createEntry(createDto);

      logger.info("Knowledge base entry created", {
        entryId: entry.id,
        scope,
        scopeId,
        term: entry.term,
        userId,
      });

      return ok(entry);
    } catch (error) {
      logger.error(
        "Failed to create knowledge base entry",
        { scope, scopeId, entryData },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to create knowledge base entry",
          error as Error,
          "KnowledgeBaseService.createEntry"
        )
      );
    }
  }

  /**
   * Update a knowledge base entry with permission validation
   */
  static async updateEntry(
    id: string,
    data: UpdateKnowledgeEntryDto,
    userId: string
  ): Promise<ActionResult<KnowledgeEntryDto>> {
    try {
      // Get existing entry to check permissions
      const existing = await KnowledgeBaseEntriesQueries.getEntryById(id);
      if (!existing) {
        return err(
          ActionErrors.notFound(
            "Knowledge base entry",
            "KnowledgeBaseService.updateEntry"
          )
        );
      }

      // Validate scope-specific permissions
      const permissionResult = await this.validateScopePermissions(
        existing.scope,
        existing.scopeId,
        userId,
        "write"
      );
      if (permissionResult.isErr()) {
        return err(
          ActionErrors.forbidden(
            "You are not authorized to update a knowledge base entry in this scope",
            {
              scope: existing.scope,
              scopeId: existing.scopeId,
              userId,
            }
          )
        );
      }

      // If term is being updated, check uniqueness
      if (data.term) {
        const existingEntries =
          await KnowledgeBaseEntriesQueries.getEntriesByScope(
            existing.scope,
            existing.scopeId,
            { includeInactive: true }
          );
        const duplicate = existingEntries.find(
          (e) =>
            (e.id !== id &&
              e.term.toLowerCase() === data?.term?.toLowerCase()) ??
            ""
        );
        if (duplicate) {
          return err(
            ActionErrors.conflict(
              `Term "${data.term}" already exists in this scope`,
              "KnowledgeBaseService.updateEntry"
            )
          );
        }
      }

      const updated = await KnowledgeBaseEntriesQueries.updateEntry(id, {
        ...data,
        term: data.term?.trim(),
        definition: data.definition?.trim(),
        context: data.context?.trim() ?? null,
      });

      if (!updated) {
        return err(
          ActionErrors.notFound(
            "Knowledge base entry",
            "KnowledgeBaseService.updateEntry"
          )
        );
      }

      logger.info("Knowledge base entry updated", {
        entryId: id,
        scope: existing.scope,
        scopeId: existing.scopeId,
        userId,
      });

      return ok(updated);
    } catch (error) {
      logger.error(
        "Failed to update knowledge base entry",
        { id },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to update knowledge base entry",
          error as Error,
          "KnowledgeBaseService.updateEntry"
        )
      );
    }
  }

  /**
   * Delete a knowledge base entry (soft delete) with permission validation
   */
  static async deleteEntry(
    id: string,
    userId: string
  ): Promise<ActionResult<void>> {
    try {
      // Get existing entry to check permissions
      const existing = await KnowledgeBaseEntriesQueries.getEntryById(id);
      if (!existing) {
        return err(
          ActionErrors.notFound(
            "Knowledge base entry",
            "KnowledgeBaseService.deleteEntry"
          )
        );
      }

      // Validate scope-specific permissions
      const permissionResult = await this.validateScopePermissions(
        existing.scope,
        existing.scopeId,
        userId,
        "write"
      );
      if (permissionResult.isErr()) {
        return permissionResult;
      }

      const deleted = await KnowledgeBaseEntriesQueries.deleteEntry(id);
      if (!deleted) {
        return err(
          ActionErrors.notFound(
            "Knowledge base entry",
            "KnowledgeBaseService.deleteEntry"
          )
        );
      }

      logger.info("Knowledge base entry deleted", {
        entryId: id,
        scope: existing.scope,
        scopeId: existing.scopeId,
        userId,
      });

      return ok(undefined);
    } catch (error) {
      logger.error(
        "Failed to delete knowledge base entry",
        { id },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to delete knowledge base entry",
          error as Error,
          "KnowledgeBaseService.deleteEntry"
        )
      );
    }
  }

  /**
   * Promote an entry to a higher scope (project → organization, organization → global)
   */
  static async promoteEntry(
    entryId: string,
    toScope: KnowledgeBaseScope,
    userId: string
  ): Promise<ActionResult<KnowledgeEntryDto>> {
    try {
      // Get existing entry
      const existing = await KnowledgeBaseEntriesQueries.getEntryById(entryId);
      if (!existing) {
        return err(
          ActionErrors.notFound(
            "Knowledge base entry",
            "KnowledgeBaseService.promoteEntry"
          )
        );
      }

      // Validate promotion is to a higher scope
      const scopeOrder: Record<KnowledgeBaseScope, number> = {
        project: 1,
        organization: 2,
        global: 3,
      };
      if (scopeOrder[toScope] <= scopeOrder[existing.scope]) {
        return err(
          ActionErrors.badRequest(
            `Cannot promote entry from ${existing.scope} to ${toScope}. Promotion must be to a higher scope.`,
            "KnowledgeBaseService.promoteEntry"
          )
        );
      }

      // Validate user has permission to create in target scope
      const targetScopeId =
        toScope === "global"
          ? null
          : toScope === "organization"
          ? existing.scopeId
          : null; // For project promotion, scopeId would need to be provided separately

      if (toScope === "project") {
        return err(
          ActionErrors.badRequest(
            "Project promotion requires explicit projectId",
            "KnowledgeBaseService.promoteEntry"
          )
        );
      }

      const permissionResult = await this.validateScopePermissions(
        toScope,
        targetScopeId,
        userId,
        "write"
      );
      if (permissionResult.isErr()) {
        return err(
          ActionErrors.forbidden(
            "You are not authorized to promote a knowledge base entry in this scope",
            {
              scope: toScope,
              scopeId: targetScopeId,
              userId,
            }
          )
        );
      }

      // Check if entry already exists in target scope
      const existingInTarget =
        await KnowledgeBaseEntriesQueries.getEntriesByScope(
          toScope,
          targetScopeId,
          { includeInactive: true }
        );
      const duplicate = existingInTarget.find(
        (e) => e.term.toLowerCase() === existing.term.toLowerCase()
      );
      if (duplicate) {
        return err(
          ActionErrors.conflict(
            `Term "${existing.term}" already exists in ${toScope} scope`,
            "KnowledgeBaseService.promoteEntry"
          )
        );
      }

      // Create new entry in target scope
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
        entryId,
        fromScope: existing.scope,
        toScope,
        userId,
      });

      return ok(promoted);
    } catch (error) {
      logger.error(
        "Failed to promote knowledge base entry",
        { entryId, toScope },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to promote knowledge base entry",
          error as Error,
          "KnowledgeBaseService.promoteEntry"
        )
      );
    }
  }

  /**
   * Build knowledge context for AI prompt injection
   * Formats knowledge entries as structured text/glossary
   */
  static async buildKnowledgeContext(
    projectId: string | null,
    organizationId: string | null
  ): Promise<ActionResult<string>> {
    try {
      const knowledgeResult = await this.getApplicableKnowledge(
        projectId,
        organizationId
      );
      if (knowledgeResult.isErr()) {
        return err(
          ActionErrors.internal(
            "Failed to get applicable knowledge",
            knowledgeResult.error,
            "KnowledgeBaseService.buildKnowledgeContext"
          )
        );
      }

      const entries = knowledgeResult.value;
      if (entries.length === 0) {
        return ok("");
      }

      // Format as glossary: "Term: Definition"
      const glossary = entries
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

      return ok(glossary);
    } catch (error) {
      logger.error(
        "Failed to build knowledge context",
        { projectId, organizationId },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to build knowledge context",
          error as Error,
          "KnowledgeBaseService.buildKnowledgeContext"
        )
      );
    }
  }

  /**
   * Get documents by scope
   */
  static async getDocumentsByScope(
    scope: KnowledgeBaseScope,
    scopeId: string | null
  ): Promise<ActionResult<KnowledgeDocumentDto[]>> {
    try {
      const documents = await KnowledgeBaseDocumentsQueries.getDocumentsByScope(
        scope,
        scopeId
      );

      return ok(documents);
    } catch (error) {
      logger.error(
        "Failed to get documents by scope",
        { scope, scopeId },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to get documents by scope",
          error as Error,
          "KnowledgeBaseService.getDocumentsByScope"
        )
      );
    }
  }

  /**
   * Create a knowledge base document with permission validation
   */
  static async createDocument(
    scope: KnowledgeBaseScope,
    scopeId: string | null,
    documentData: {
      title: string;
      description?: string | null;
      fileUrl: string;
      fileName: string;
      fileSize: number;
      fileType: string;
    },
    userId: string
  ): Promise<ActionResult<KnowledgeDocumentDto>> {
    try {
      // Validate scope-specific permissions
      const permissionResult = await this.validateScopePermissions(
        scope,
        scopeId,
        userId,
        "write"
      );
      if (permissionResult.isErr()) {
        return err(
          ActionErrors.forbidden(
            "You are not authorized to create a knowledge base document in this scope",
            {
              scope,
              scopeId,
              userId,
            }
          )
        );
      }

      const createDto: CreateKnowledgeDocumentDto = {
        scope,
        scopeId,
        title: documentData.title.trim(),
        description: documentData.description?.trim() ?? null,
        fileUrl: documentData.fileUrl,
        fileName: documentData.fileName,
        fileSize: documentData.fileSize,
        fileType: documentData.fileType,
        createdById: userId,
      };

      const document = await KnowledgeBaseDocumentsQueries.createDocument(
        createDto
      );

      logger.info("Knowledge base document created", {
        documentId: document.id,
        scope,
        scopeId,
        title: document.title,
        userId,
      });

      return ok(document);
    } catch (error) {
      logger.error(
        "Failed to create knowledge base document",
        { scope, scopeId, documentData },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to create knowledge base document",
          error as Error,
          "KnowledgeBaseService.createDocument"
        )
      );
    }
  }

  /**
   * Delete a knowledge base document with permission validation
   */
  static async deleteDocument(
    id: string,
    userId: string
  ): Promise<ActionResult<void>> {
    try {
      // Get existing document to check permissions
      const existing = await KnowledgeBaseDocumentsQueries.getDocumentById(id);
      if (!existing) {
        return err(
          ActionErrors.notFound(
            "Knowledge base document",
            "KnowledgeBaseService.deleteDocument"
          )
        );
      }

      // Validate scope-specific permissions
      const permissionResult = await this.validateScopePermissions(
        existing.scope,
        existing.scopeId,
        userId,
        "write"
      );
      if (permissionResult.isErr()) {
        return permissionResult;
      }

      const deleted = await KnowledgeBaseDocumentsQueries.deleteDocument(id);
      if (!deleted) {
        return err(
          ActionErrors.notFound(
            "Knowledge base document",
            "KnowledgeBaseService.deleteDocument"
          )
        );
      }

      logger.info("Knowledge base document deleted", {
        documentId: id,
        scope: existing.scope,
        scopeId: existing.scopeId,
        userId,
      });

      return ok(undefined);
    } catch (error) {
      logger.error(
        "Failed to delete knowledge base document",
        { id },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to delete knowledge base document",
          error as Error,
          "KnowledgeBaseService.deleteDocument"
        )
      );
    }
  }

  /**
   * Validate scope-specific permissions
   * Project scope: requires project access
   * Organization scope: requires admin/manager role
   * Global scope: requires super admin role
   */
  private static async validateScopePermissions(
    scope: KnowledgeBaseScope,
    scopeId: string | null,
    userId: string,
    operation: "read" | "write"
  ): Promise<ActionResult<void>> {
    try {
      const authResult = await getAuthSession();
      if (authResult.isErr() || !authResult.value.user) {
        return err(
          ActionErrors.unauthenticated(
            "Authentication required",
            "KnowledgeBaseService.validateScopePermissions"
          )
        );
      }

      const user = authResult.value.user;

      if (scope === "project") {
        // Project scope: Check project exists and user has access
        if (!scopeId) {
          return err(
            ActionErrors.badRequest(
              "Project scope requires scopeId",
              "KnowledgeBaseService.validateScopePermissions"
            )
          );
        }

        // Verify project exists and belongs to user's organization
        const project = await ProjectQueries.findById(
          scopeId,
          authResult.value.organization?.orgCode ?? ""
        );
        if (!project) {
          return err(
            ActionErrors.notFound(
              "Project",
              "KnowledgeBaseService.validateScopePermissions"
            )
          );
        }

        // For write operations, check user has project update permission
        // (Read is allowed for any user with project access)
        if (operation === "write") {
          // Project members can write - this is validated by project access check above
          // Additional permission checks would go here if needed
        }
      } else if (scope === "organization") {
        // Organization scope: Requires admin or manager role for write
        if (!scopeId) {
          return err(
            ActionErrors.badRequest(
              "Organization scope requires scopeId",
              "KnowledgeBaseService.validateScopePermissions"
            )
          );
        }

        // Verify organization matches user's organization
        if (scopeId !== authResult.value.organization?.orgCode) {
          return err(
            ActionErrors.forbidden(
              "Cannot access other organization's knowledge base",
              {
                scope,
                scopeId,
                userId,
              },
              "KnowledgeBaseService.validateScopePermissions"
            )
          );
        }

        // For write operations, require admin or manager role
        if (operation === "write") {
          const userRoles = user.roles ?? [];
          const hasPermission =
            userRoles.includes(ROLES.ADMIN) ||
            userRoles.includes(ROLES.MANAGER) ||
            userRoles.includes(ROLES.SUPER_ADMIN);

          if (!hasPermission) {
            return err(
              ActionErrors.forbidden(
                "Organization knowledge base requires admin or manager role",
                {
                  scope,
                  scopeId,
                  userId,
                },
                "KnowledgeBaseService.validateScopePermissions"
              )
            );
          }
        }
      } else if (scope === "global") {
        // Global scope: Requires super admin role
        if (scopeId !== null) {
          return err(
            ActionErrors.badRequest(
              "Global scope must have null scopeId",
              "KnowledgeBaseService.validateScopePermissions"
            )
          );
        }

        // For write operations, require super admin role
        if (operation === "write") {
          const userRoles = user.roles ?? [];
          if (!userRoles.includes(ROLES.SUPER_ADMIN)) {
            return err(
              ActionErrors.forbidden(
                "Global knowledge base requires super admin role",
                {
                  scope,
                  scopeId,
                  userId,
                },
                "KnowledgeBaseService.validateScopePermissions"
              )
            );
          }
        }
      }

      return ok(undefined);
    } catch (error) {
      logger.error(
        "Failed to validate scope permissions",
        { scope, scopeId, userId, operation },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to validate scope permissions",
          error as Error,
          "KnowledgeBaseService.validateScopePermissions"
        )
      );
    }
  }
}

