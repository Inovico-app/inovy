import { CacheTags } from "@/lib/cache-utils";
import { logger } from "@/lib/logger";
import { cacheTag } from "next/cache";
import { KnowledgeBaseEntriesQueries } from "../data-access";
import type { KnowledgeBaseScope } from "../db/schema/knowledge-base-entries";
import type {
  HierarchicalKnowledgeEntryDto,
  KnowledgeDocumentDto,
  KnowledgeEntryDto,
} from "../dto/knowledge-base.dto";
import { KnowledgeBaseService } from "../services/knowledge-base.service";

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

  // Validate scopeId for non-global scopes
  if (scope !== "global" && !scopeId) {
    throw new Error(
      `scopeId is required for ${scope} scope in getCachedKnowledgeEntries`
    );
  }

  // Build cache tag with validated scopeId
  // After validation, scopeId is guaranteed to be a string for non-global scopes
  let tag: string;
  if (scope === "global") {
    tag = CacheTags.knowledgeEntries("global");
  } else if (scope === "organization") {
    tag = CacheTags.knowledgeEntries("org", scopeId as string);
  } else {
    tag = CacheTags.knowledgeEntries("project", scopeId as string);
  }

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

  // Validate scopeId for non-global scopes
  if (scope !== "global" && !scopeId) {
    throw new Error(
      `scopeId is required for ${scope} scope in getCachedKnowledgeDocuments`
    );
  }

  // Build cache tag with validated scopeId
  // After validation, scopeId is guaranteed to be a string for non-global scopes
  let tag: string;
  if (scope === "global") {
    tag = CacheTags.knowledgeDocuments("global");
  } else if (scope === "organization") {
    tag = CacheTags.knowledgeDocuments("org", scopeId as string);
  } else {
    tag = CacheTags.knowledgeDocuments("project", scopeId as string);
  }

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

  // Early return if required IDs are missing
  if (!projectId || !organizationId) {
    return [];
  }

  // At this point, projectId and organizationId are guaranteed to be non-null strings
  const hierarchyTag = CacheTags.knowledgeHierarchy(projectId, organizationId);

  if (!hierarchyTag) {
    // Tag without hierarchical cache tag
    cacheTag(
      CacheTags.knowledgeEntries("project", projectId),
      CacheTags.knowledgeEntries("org", organizationId),
      CacheTags.knowledgeEntries("global")
    );
  } else {
    // Tag with hierarchical cache tag
    cacheTag(
      hierarchyTag,
      CacheTags.knowledgeEntries("project", projectId),
      CacheTags.knowledgeEntries("org", organizationId),
      CacheTags.knowledgeEntries("global")
    );
  }

  try {
    const entries = await KnowledgeBaseEntriesQueries.getHierarchicalEntries(
      projectId,
      organizationId
    );
    return entries;
  } catch (error) {
    logger.error(
      "Failed to get hierarchical knowledge entries",
      { projectId, organizationId },
      error as Error
    );
    return [];
  }
}

