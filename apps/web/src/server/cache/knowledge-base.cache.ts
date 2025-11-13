import { CacheTags } from "@/lib/cache-utils";
import { cacheTag } from "next/cache";
import {
  KnowledgeBaseEntriesQueries,
  KnowledgeBaseDocumentsQueries,
} from "../data-access";
import { KnowledgeBaseService } from "../services/knowledge-base.service";
import type {
  KnowledgeEntryDto,
  KnowledgeDocumentDto,
  HierarchicalKnowledgeEntryDto,
} from "../dto/knowledge-base.dto";
import type { KnowledgeBaseScope } from "../db/schema/knowledge-base-entries";

/**
 * Cached knowledge base queries
 * Uses Next.js 16 cache with tags for invalidation
 */

/**
 * Get knowledge entries by scope (cached)
 */
export async function getCachedKnowledgeEntries(
  scope: KnowledgeBaseScope,
  scopeId: string | null
): Promise<KnowledgeEntryDto[]> {
  "use cache";
  const tag =
    scope === "global"
      ? CacheTags.knowledgeEntries("global")
      : scope === "organization"
        ? CacheTags.knowledgeEntries("org", scopeId ?? undefined)
        : CacheTags.knowledgeEntries("project", scopeId ?? undefined);
  cacheTag(tag);
  const result = await KnowledgeBaseService.getEntriesByScope(scope, scopeId);
  return result.isErr() ? [] : result.value;
}

/**
 * Get knowledge documents by scope (cached)
 */
export async function getCachedKnowledgeDocuments(
  scope: KnowledgeBaseScope,
  scopeId: string | null
): Promise<KnowledgeDocumentDto[]> {
  "use cache";
  const tag =
    scope === "global"
      ? CacheTags.knowledgeDocuments("global")
      : scope === "organization"
        ? CacheTags.knowledgeDocuments("org", scopeId ?? undefined)
        : CacheTags.knowledgeDocuments("project", scopeId ?? undefined);
  cacheTag(tag);
  const result = await KnowledgeBaseService.getDocumentsByScope(scope, scopeId);
  return result.isErr() ? [] : result.value;
}

/**
 * Get hierarchical knowledge entries (project → organization → global) (cached)
 * Returns entries with priority ordering, deduplicated by term
 */
export async function getCachedHierarchicalKnowledge(
  projectId: string | null,
  organizationId: string | null
): Promise<HierarchicalKnowledgeEntryDto[]> {
  "use cache";
  if (!projectId || !organizationId) {
    return [];
  }

  // Tag with hierarchical cache tag
  cacheTag(
    CacheTags.knowledgeHierarchy(projectId, organizationId),
    CacheTags.knowledgeEntries("project", projectId),
    CacheTags.knowledgeEntries("org", organizationId),
    CacheTags.knowledgeEntries("global")
  );

  const entries =
    await KnowledgeBaseEntriesQueries.getHierarchicalEntries(
      projectId,
      organizationId
    );

  return entries;
}

