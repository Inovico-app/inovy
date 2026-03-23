import { CacheTags } from "../cache-utils";
import type { CachePolicy } from "./types";

/**
 * Builds cache tags for the knowledge base hierarchy.
 *
 * Maps the public "organization" scope label to the internal "org" scope used
 * by CacheTags. Guards against null/undefined scopeId for non-global scopes —
 * if scopeId is absent for a non-global scope, falls back to global tags only
 * rather than throwing.
 *
 * @param scope        - The knowledge scope ("project" | "organization" | "global" | "team")
 * @param scopeId      - The ID for the scope entity (null/undefined is safe; triggers fallback)
 * @param organizationId - The organization UUID (used for project-scope hierarchy tags)
 */
export function buildKnowledgeTags(
  scope: "project" | "organization" | "global" | "team",
  scopeId: string | null | undefined,
  organizationId: string,
): string[] {
  const globalTags = [
    CacheTags.knowledgeEntries("global"),
    CacheTags.knowledgeDocuments("global"),
  ];

  if (scope === "global") {
    return globalTags;
  }

  // Guard: fall back to global-only when scopeId is missing for non-global scopes.
  // CacheTags.knowledgeEntries/knowledgeDocuments throw if scopeId is absent for
  // non-global scopes, so we must not call them.
  if (!scopeId) {
    return globalTags;
  }

  if (scope === "organization") {
    return [
      CacheTags.knowledgeEntries("org", scopeId),
      CacheTags.knowledgeDocuments("org", scopeId),
      ...globalTags,
    ];
  }

  if (scope === "team") {
    return [
      CacheTags.knowledgeEntries("team", scopeId),
      CacheTags.knowledgeDocuments("team", scopeId),
      ...globalTags,
    ];
  }

  // scope === "project"
  const tags: string[] = [
    CacheTags.knowledgeEntries("project", scopeId),
    CacheTags.knowledgeDocuments("project", scopeId),
    CacheTags.knowledgeEntries("org", organizationId),
    CacheTags.knowledgeDocuments("org", organizationId),
    ...globalTags,
  ];

  const hierarchyTag = CacheTags.knowledgeHierarchy(scopeId, organizationId);
  if (hierarchyTag) {
    tags.push(hierarchyTag);
  }

  return tags;
}

/**
 * Registry of cache policies keyed by action name.
 * Populated incrementally — Task 3 will add entries here.
 */
export const CACHE_POLICIES: Record<string, CachePolicy> = {};
