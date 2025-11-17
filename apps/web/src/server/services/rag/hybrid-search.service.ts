/**
 * File: lib/rag/hybrid-search.ts
 *
 * Combines vector similarity search with keyword-based search using Qdrant
 */

import { ActionErrors, type ActionResult } from "@/lib/action-errors";
import { logger } from "@/lib/logger";
import { QdrantClientService } from "@/server/services/rag/qdrant.service";
import { type SearchResult } from "@/server/services/rag/rag.service";
import { err, ok } from "neverthrow";

export interface HybridSearchOptions {
  userId?: string;
  organizationId?: string;
  projectId?: string;
  limit?: number;
  vectorWeight?: number;
  keywordWeight?: number;
  scoreThreshold?: number;
  filters?: Record<string, unknown>;
  collectionName?: string;
}

interface RankedResult {
  id: string;
  contentType: string;
  contentId: string;
  contentText: string;
  similarity: number;
  metadata: Record<string, unknown> | null;
  rank: number;
  source: "vector" | "keyword";
}

export class HybridSearchEngine {
  private qdrantService: QdrantClientService;
  private readonly defaultCollectionName: string;

  constructor(collectionName?: string) {
    this.qdrantService = QdrantClientService.getInstance();
    this.defaultCollectionName = collectionName ?? "knowledge_base";
  }

  /**
   * Hybrid search combining vector similarity and keyword matching
   *
   * Algorithm:
   * 1. Perform vector search (semantic similarity)
   * 2. Perform keyword search (Qdrant full-text search on content field)
   * 3. Merge results using Reciprocal Rank Fusion (RRF)
   */
  async search(
    query: string,
    queryEmbedding: number[],
    options: HybridSearchOptions = {}
  ): Promise<ActionResult<SearchResult[]>> {
    try {
      const {
        userId,
        organizationId,
        projectId,
        limit = 10,
        vectorWeight = 0.7,
        keywordWeight = 0.3,
        scoreThreshold = 0.5,
        filters = {},
        collectionName,
      } = options;

      const targetCollection = collectionName ?? this.defaultCollectionName;

      if (!userId && !organizationId) {
        return err(
          ActionErrors.badRequest(
            "Either userId or organizationId is required",
            "HybridSearchEngine.search"
          )
        );
      }

      logger.debug("Performing hybrid search", {
        component: "HybridSearchEngine",
        queryLength: query.length,
        userId,
        organizationId,
        projectId,
        limit,
      });

      // Ensure Qdrant is initialized
      const initResult = await this.qdrantService.initialize(targetCollection);
      if (initResult.isErr()) {
        return err(initResult.error);
      }

      // Build base filter for Qdrant
      const baseFilter = this.buildFilter(
        userId,
        organizationId,
        projectId,
        filters
      );

      // 1. Vector search
      const vectorResults = await this.vectorSearch(
        queryEmbedding,
        baseFilter,
        Math.round(limit * 1.5), // Fetch more for fusion
        scoreThreshold,
        targetCollection
      );

      // 2. Keyword search using Qdrant's scroll with full-text search
      const keywordResults = await this.keywordSearch(
        query,
        baseFilter,
        Math.round(limit * 1.5),
        targetCollection
      );

      // 3. Merge using Reciprocal Rank Fusion
      const mergedResults = this.reciprocalRankFusion(
        vectorResults,
        keywordResults,
        vectorWeight,
        keywordWeight
      );

      // Transform to SearchResult format
      const searchResults: SearchResult[] = mergedResults.slice(0, limit).map(
        (result) =>
          ({
            id: result.id,
            contentType: result.contentType as SearchResult["contentType"],
            contentId: result.contentId,
            contentText: result.contentText,
            similarity: result.similarity,
            metadata: (result.metadata as SearchResult["metadata"]) || {},
          } satisfies SearchResult)
      );

      logger.debug("Hybrid search completed", {
        component: "HybridSearchEngine",
        vectorResults: vectorResults.length,
        keywordResults: keywordResults.length,
        mergedResults: searchResults.length,
      });

      return ok(searchResults);
    } catch (error) {
      logger.error("Error performing hybrid search", {
        component: "HybridSearchEngine",
        error: error instanceof Error ? error.message : String(error),
      });
      return err(
        ActionErrors.internal(
          "Error performing hybrid search",
          error as Error,
          "HybridSearchEngine.search"
        )
      );
    }
  }

  /**
   * Perform vector similarity search using Qdrant
   */
  private async vectorSearch(
    embedding: number[],
    filter: {
      must?: Array<{
        key: string;
        match?: { value: string | string[] };
      }>;
    },
    limit: number,
    scoreThreshold: number,
    collectionName: string
  ): Promise<RankedResult[]> {
    try {
      const searchResult = await this.qdrantService.search(embedding, {
        limit,
        scoreThreshold,
        filter,
        collectionName,
      });

      if (searchResult.isErr()) {
        logger.error("Vector search failed", {
          component: "HybridSearchEngine",
          error: searchResult.error.message,
        });
        return [];
      }

      return searchResult.value.map((result, index) => {
        const payload = result.payload;
        return {
          id: String(result.id),
          contentType: (payload?.contentType as string) ?? "knowledge_document",
          contentId: (payload?.documentId as string) ?? String(result.id),
          contentText: (payload?.content as string) ?? "",
          similarity: result.score,
          metadata: payload
            ? {
                title: payload.filename as string | undefined,
                documentId: payload.documentId as string | undefined,
                documentTitle: payload.filename as string | undefined,
                ...payload,
              }
            : null,
          rank: index + 1,
          source: "vector" as const,
        };
      });
    } catch (error) {
      logger.error("Error in vector search", {
        component: "HybridSearchEngine",
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Perform keyword-based full-text search using Qdrant's scroll API
   * Qdrant supports full-text search on text-indexed payload fields
   */
  private async keywordSearch(
    query: string,
    baseFilter: {
      must?: Array<{
        key: string;
        match?: { value: string | string[] };
      }>;
    },
    limit: number,
    collectionName: string
  ): Promise<RankedResult[]> {
    try {
      // Validate query has searchable terms
      const searchTerms = query
        .split(/\s+/)
        .filter((term) => term.length > 0)
        .map((term) => term.replace(/[^\w]/g, ""))
        .filter((term) => term.length > 0);

      if (searchTerms.length === 0) {
        return [];
      }

      // Qdrant supports full-text search via text match on indexed text fields
      // The "content" field is indexed as "text" in Qdrant, so we can use match with text
      const filter = {
        must: [
          ...(baseFilter.must ?? []),
          {
            key: "content",
            match: {
              text: query, // Qdrant will perform full-text search on text-indexed fields
            },
          },
        ],
      };

      // Use Qdrant's scroll API to search by payload filter
      const scrollResult = await this.qdrantService.scroll(filter, {
        limit,
        collectionName,
      });

      if (scrollResult.isErr()) {
        logger.error("Keyword search failed", {
          component: "HybridSearchEngine",
          error: scrollResult.error.message,
        });
        return [];
      }

      // Rank results by simple text match score (number of query terms found)
      // Qdrant's text match doesn't return scores, so we calculate a simple match score
      const queryTerms = query
        .toLowerCase()
        .split(/\s+/)
        .filter((t) => t.length > 0);

      return scrollResult.value
        .map((point) => {
          const payload = point.payload;
          const content = ((payload?.content as string) ?? "").toLowerCase();
          const matchScore =
            queryTerms.reduce((score, term) => {
              return score + (content.includes(term) ? 1 : 0);
            }, 0) / queryTerms.length;

          return {
            id: String(point.id),
            contentType:
              (payload?.contentType as string) ?? "knowledge_document",
            contentId: (payload?.documentId as string) ?? String(point.id),
            contentText: (payload?.content as string) ?? "",
            similarity: matchScore,
            metadata: payload
              ? {
                  title: payload.filename as string | undefined,
                  documentId: payload.documentId as string | undefined,
                  documentTitle: payload.filename as string | undefined,
                  ...payload,
                }
              : null,
            rank: 0, // Will be set after sorting
            source: "keyword" as const,
          };
        })
        .filter((result) => result.similarity > 0)
        .sort((a, b) => b.similarity - a.similarity)
        .map((result, index) => ({
          ...result,
          rank: index + 1,
        }));
    } catch (error) {
      logger.error("Error in keyword search", {
        component: "HybridSearchEngine",
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Build Qdrant filter from options
   */
  private buildFilter(
    userId: string | undefined,
    organizationId: string | undefined,
    projectId: string | undefined,
    additionalFilters: Record<string, unknown>
  ): {
    must?: Array<{
      key: string;
      match?: { value: string | string[] };
    }>;
  } {
    const must: Array<{
      key: string;
      match?: { value: string | string[] };
    }> = [];

    if (userId) {
      must.push({
        key: "userId",
        match: { value: userId },
      });
    }

    if (organizationId) {
      must.push({
        key: "organizationId",
        match: { value: organizationId },
      });
    }

    if (projectId) {
      must.push({
        key: "projectId",
        match: { value: projectId },
      });
    }

    // Add additional filters
    Object.entries(additionalFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          // For arrays, match any value in the array
          must.push({
            key,
            match: { value: value.map((v) => String(v)) },
          });
        } else {
          must.push({
            key,
            match: { value: String(value) },
          });
        }
      }
    });

    return must.length > 0 ? { must } : {};
  }

  /**
   * Reciprocal Rank Fusion (RRF)
   *
   * RRF Score = Σ(weight / (k + rank_i))
   * where k = 60 (standard constant)
   */
  private reciprocalRankFusion(
    vectorResults: RankedResult[],
    keywordResults: RankedResult[],
    vectorWeight: number,
    keywordWeight: number,
    k: number = 60
  ): RankedResult[] {
    const scoreMap = new Map<
      string,
      {
        result: RankedResult;
        vectorRank?: number;
        keywordRank?: number;
        fusedScore: number;
      }
    >();

    // Add vector results
    vectorResults.forEach((result) => {
      scoreMap.set(result.id, {
        result,
        vectorRank: result.rank,
        fusedScore: vectorWeight / (k + result.rank),
      });
    });

    // Add/merge keyword results
    keywordResults.forEach((result) => {
      const existing = scoreMap.get(result.id);
      const keywordScore = keywordWeight / (k + result.rank);

      if (existing) {
        existing.keywordRank = result.rank;
        existing.fusedScore += keywordScore;
      } else {
        scoreMap.set(result.id, {
          result,
          keywordRank: result.rank,
          fusedScore: keywordScore,
        });
      }
    });

    // Sort by fused score and update similarity
    const fusedResults = Array.from(scoreMap.values())
      .sort((a, b) => b.fusedScore - a.fusedScore)
      .map(({ result, fusedScore }) => ({
        ...result,
        similarity: fusedScore, // Use fused score as similarity
      }));

    return fusedResults;
  }
}

