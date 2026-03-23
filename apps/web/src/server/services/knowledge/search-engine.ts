import type { ActionResult } from "@/lib/server-action-client/action-errors";
import { RAGService } from "@/server/services/rag/rag.service";
import type { SearchResult } from "@/server/services/rag/types";
import type { SearchHit, SearchOptions, ScopeRef } from "./types";

const DEFAULT_LIMIT = 8;
const DEFAULT_SCORE_THRESHOLD = 0.6;
const DEFAULT_USE_HYBRID = true;
const DEFAULT_USE_RERANKING = true;

/**
 * SearchEngine — static facade over a lazy-initialized RAGService singleton.
 *
 * Provides two search methods:
 * - `search()` returns mapped `SearchHit[]` for UI consumption
 * - `searchRaw()` returns raw `SearchResult[]` for services that need full metadata
 *   (e.g. ChatContextService for source citation formatting)
 */
export class SearchEngine {
  private static ragService: RAGService | null = null;

  private static getRagService(): RAGService {
    if (!this.ragService) {
      this.ragService = new RAGService();
    }
    return this.ragService;
  }

  /**
   * Search knowledge base and return mapped SearchHit results.
   *
   * Applies sensible defaults (limit: 8, scoreThreshold: 0.6, hybrid + reranking enabled).
   */
  static async search(
    query: string,
    scope: ScopeRef,
    options?: SearchOptions,
  ): Promise<ActionResult<SearchHit[]>> {
    const rawResult = await this.searchRaw(query, scope, options);

    return rawResult.map((results) => results.map(mapToSearchHit));
  }

  /**
   * Search knowledge base and return raw SearchResult[] without mapping.
   *
   * Used by ChatContextService which needs full SearchResult metadata
   * for source citation formatting and token-limited result slicing.
   */
  static async searchRaw(
    query: string,
    scope: ScopeRef & { userTeamIds?: string[]; isOrgAdmin?: boolean },
    options?: SearchOptions,
  ): Promise<ActionResult<SearchResult[]>> {
    const rag = this.getRagService();

    return await rag.search(query, "", {
      limit: options?.limit ?? DEFAULT_LIMIT,
      scoreThreshold: options?.scoreThreshold ?? DEFAULT_SCORE_THRESHOLD,
      useHybrid: options?.useHybrid ?? DEFAULT_USE_HYBRID,
      useReranking: options?.useReranking ?? DEFAULT_USE_RERANKING,
      organizationId: scope.organizationId,
      projectId: scope.projectId ?? undefined,
      teamId: scope.teamId ?? undefined,
      userTeamIds: scope.userTeamIds,
      isOrgAdmin: scope.isOrgAdmin,
    });
  }
}

function mapToSearchHit(result: SearchResult): SearchHit {
  return {
    id: result.id,
    content: result.contentText,
    similarity: result.similarity,
    source: {
      contentType: result.contentType,
      documentId: result.metadata.documentId,
      title: result.metadata.title ?? result.metadata.recordingTitle,
      recordingId: result.metadata.recordingId,
      projectId: result.metadata.projectId as string | undefined,
    },
  };
}
