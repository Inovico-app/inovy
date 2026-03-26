import { and, eq, ilike, isNull, or } from "drizzle-orm";
import { db } from "../db";
import {
  knowledgeBaseEntries,
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
    data: CreateKnowledgeEntryDto,
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
    data: UpdateKnowledgeEntryDto,
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
    },
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
    searchTerm: string,
  ): Promise<KnowledgeEntryDto[]> {
    const conditions = [
      eq(knowledgeBaseEntries.scope, scope),
      eq(knowledgeBaseEntries.isActive, true),
      or(
        ilike(knowledgeBaseEntries.term, `%${searchTerm}%`),
        ilike(knowledgeBaseEntries.definition, `%${searchTerm}%`),
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
   * Get hierarchical entries (team → project → organization → global)
   * Returns entries with priority ordering, deduplicated by term
   * Team entries (priority 1) override project (priority 2), which override organization (priority 3), which override global (priority 4)
   */
  static async getHierarchicalEntries(
    projectId: string | null,
    organizationId: string | null,
    teamId?: string | null,
  ): Promise<HierarchicalKnowledgeEntryDto[]> {
    if (!organizationId) {
      // If no org, return empty array
      return [];
    }

    // Fetch entries from all applicable scopes with priority
    // Priority 1 = team, 2 = project, 3 = organization, 4 = global
    const hasTeam = teamId != null && teamId.trim().length > 0;
    const hasProject = projectId != null;

    const queries: Promise<KnowledgeEntryDto[]>[] = [];

    // Priority 3: Organization entries (always included when org is known)
    queries.push(this.getEntriesByScope("organization", organizationId));
    // Priority 4: Global entries (always included)
    queries.push(this.getEntriesByScope("global", null));

    const [orgEntries, globalEntries] = await Promise.all(queries);

    // Priority 1: Team entries (fetched separately when teamId is present)
    let teamEntries: KnowledgeEntryDto[] = [];
    if (hasTeam) {
      teamEntries = await this.getEntriesByScope("team", teamId!);
    }

    // Priority 2: Project entries (fetched separately when projectId is present)
    let projectEntries: KnowledgeEntryDto[] = [];
    if (hasProject) {
      projectEntries = await this.getEntriesByScope("project", projectId!);
    }

    // Combine all entries with priority
    const allEntries: Array<HierarchicalKnowledgeEntryDto> = [];
    if (hasTeam) {
      allEntries.push(...teamEntries.map((e) => ({ ...e, priority: 1 })));
    }
    if (hasProject) {
      allEntries.push(...projectEntries.map((e) => ({ ...e, priority: 2 })));
    }
    allEntries.push(
      ...orgEntries.map((e) => ({ ...e, priority: 3 })),
      ...globalEntries.map((e) => ({ ...e, priority: 4 })),
    );

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
      a.term.localeCompare(b.term),
    );
  }
}
