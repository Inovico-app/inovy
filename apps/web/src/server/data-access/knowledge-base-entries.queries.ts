import { and, eq, ilike, isNull, or } from "drizzle-orm";
import { db } from "../db";
import {
  knowledgeBaseEntries,
  type KnowledgeBaseEntry,
  type KnowledgeBaseScope,
} from "../db/schema/knowledge-base-entries";
import type {
  CreateKnowledgeEntryDto,
  HierarchicalKnowledgeEntryDto,
  KnowledgeEntryDto,
  UpdateKnowledgeEntryDto,
} from "../dto/knowledge-base.dto";

/**
 * Database queries for Knowledge Base Entries operations
 * Pure data access layer - no business logic
 */
export class KnowledgeBaseEntriesQueries {
  /**
   * Create a new knowledge base entry
   */
  static async createEntry(
    data: CreateKnowledgeEntryDto
  ): Promise<KnowledgeEntryDto> {
    const [entry] = await db
      .insert(knowledgeBaseEntries)
      .values({
        scope: data.scope,
        scopeId: data.scopeId,
        term: data.term,
        definition: data.definition,
        context: data.context ?? null,
        examples: data.examples ?? null,
        createdById: data.createdById,
      })
      .returning();

    return {
      id: entry.id,
      scope: entry.scope,
      scopeId: entry.scopeId,
      term: entry.term,
      definition: entry.definition,
      context: entry.context,
      examples: entry.examples,
      isActive: entry.isActive,
      createdById: entry.createdById,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };
  }

  /**
   * Update an existing knowledge base entry
   */
  static async updateEntry(
    id: string,
    data: UpdateKnowledgeEntryDto
  ): Promise<KnowledgeEntryDto | null> {
    const [entry] = await db
      .update(knowledgeBaseEntries)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(knowledgeBaseEntries.id, id))
      .returning();

    if (!entry) return null;

    return {
      id: entry.id,
      scope: entry.scope,
      scopeId: entry.scopeId,
      term: entry.term,
      definition: entry.definition,
      context: entry.context,
      examples: entry.examples,
      isActive: entry.isActive,
      createdById: entry.createdById,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };
  }

  /**
   * Soft delete a knowledge base entry (set is_active = false)
   */
  static async deleteEntry(id: string): Promise<boolean> {
    const result = await db
      .update(knowledgeBaseEntries)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(knowledgeBaseEntries.id, id))
      .returning();

    return result.length > 0;
  }

  /**
   * Get knowledge base entry by ID
   */
  static async getEntryById(id: string): Promise<KnowledgeEntryDto | null> {
    const [entry] = await db
      .select()
      .from(knowledgeBaseEntries)
      .where(eq(knowledgeBaseEntries.id, id))
      .limit(1);

    if (!entry) return null;

    return {
      id: entry.id,
      scope: entry.scope,
      scopeId: entry.scopeId,
      term: entry.term,
      definition: entry.definition,
      context: entry.context,
      examples: entry.examples,
      isActive: entry.isActive,
      createdById: entry.createdById,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };
  }

  /**
   * Get all entries for a specific scope
   * Returns only active entries by default
   */
  static async getEntriesByScope(
    scope: KnowledgeBaseScope,
    scopeId: string | null,
    options?: {
      includeInactive?: boolean;
    }
  ): Promise<KnowledgeEntryDto[]> {
    const conditions = [eq(knowledgeBaseEntries.scope, scope)];

    if (scopeId === null) {
      conditions.push(isNull(knowledgeBaseEntries.scopeId));
    } else {
      conditions.push(eq(knowledgeBaseEntries.scopeId, scopeId));
    }

    if (!options?.includeInactive) {
      conditions.push(eq(knowledgeBaseEntries.isActive, true));
    }

    const entries = await db
      .select()
      .from(knowledgeBaseEntries)
      .where(and(...conditions))
      .orderBy(knowledgeBaseEntries.term);

    return entries.map((entry) => ({
      id: entry.id,
      scope: entry.scope,
      scopeId: entry.scopeId,
      term: entry.term,
      definition: entry.definition,
      context: entry.context,
      examples: entry.examples,
      isActive: entry.isActive,
      createdById: entry.createdById,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    }));
  }

  /**
   * Search entries by term or definition within a scope
   */
  static async searchEntries(
    scope: KnowledgeBaseScope,
    scopeId: string | null,
    searchTerm: string
  ): Promise<KnowledgeEntryDto[]> {
    const conditions = [
      eq(knowledgeBaseEntries.scope, scope),
      eq(knowledgeBaseEntries.isActive, true),
      or(
        ilike(knowledgeBaseEntries.term, `%${searchTerm}%`),
        ilike(knowledgeBaseEntries.definition, `%${searchTerm}%`)
      ),
    ];

    if (scopeId === null) {
      conditions.push(isNull(knowledgeBaseEntries.scopeId));
    } else {
      conditions.push(eq(knowledgeBaseEntries.scopeId, scopeId));
    }

    const entries = await db
      .select()
      .from(knowledgeBaseEntries)
      .where(and(...conditions))
      .orderBy(knowledgeBaseEntries.term);

    return entries.map((entry) => ({
      id: entry.id,
      scope: entry.scope,
      scopeId: entry.scopeId,
      term: entry.term,
      definition: entry.definition,
      context: entry.context,
      examples: entry.examples,
      isActive: entry.isActive,
      createdById: entry.createdById,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    }));
  }

  /**
   * Get hierarchical entries (project → organization → global)
   * Returns entries with priority ordering, deduplicated by term
   * Project entries (priority 1) override organization (priority 2), which override global (priority 3)
   */
  static async getHierarchicalEntries(
    projectId: string | null,
    organizationId: string | null
  ): Promise<HierarchicalKnowledgeEntryDto[]> {
    if (!projectId || !organizationId) {
      // If no project/org, return empty array
      return [];
    }

    // Fetch entries from all three scopes with priority
    // Priority 1 = project, 2 = organization, 3 = global
    const [projectEntries, orgEntries, globalEntries] = await Promise.all([
      // Priority 1: Project entries
      this.getEntriesByScope("project", projectId),
      // Priority 2: Organization entries
      this.getEntriesByScope("organization", organizationId),
      // Priority 3: Global entries
      this.getEntriesByScope("global", null),
    ]);

    // Combine all entries with priority
    const allEntries: Array<HierarchicalKnowledgeEntryDto> = [
      ...projectEntries.map((e) => ({ ...e, priority: 1 })),
      ...orgEntries.map((e) => ({ ...e, priority: 2 })),
      ...globalEntries.map((e) => ({ ...e, priority: 3 })),
    ];

    // Deduplicate by term, keeping highest priority (lowest number)
    const termMap = new Map<string, HierarchicalKnowledgeEntryDto>();
    for (const entry of allEntries) {
      const existing = termMap.get(entry.term.toLowerCase());
      if (!existing || entry.priority < existing.priority) {
        termMap.set(entry.term.toLowerCase(), entry);
      }
    }

    // Return deduplicated entries sorted by term
    return Array.from(termMap.values()).sort((a, b) =>
      a.term.localeCompare(b.term)
    );
  }
}

