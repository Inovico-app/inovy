/**
 * File: lib/rag/reranking.ts
 *
 * Re-ranks search results using a cross-encoder model
 * for improved relevance
 */

import { logger } from "@/lib/logger";
import {
  ActionErrors,
  type ActionResult,
} from "@/lib/server-action-client/action-errors";
import { err, ok } from "neverthrow";
import type { SearchResult } from "./types";
import { secureFetch } from "../../lib/secure-fetch";

export class RerankerService {
  private model = "cross-encoder/ms-marco-MiniLM-L-6-v2";
  private apiUrl = "https://api-inference.huggingface.co/models/";
  private static apiKeyWarningLogged = false;
  private static readonly MAX_RESULTS_FOR_RERANKING = 50;

  /**
   * Re-rank search results using cross-encoder
   *
   * Cross-encoders are more accurate than bi-encoders for re-ranking
   * because they consider the query and document together
   */
  async rerank(
    query: string,
    results: SearchResult[],
    topK: number = 5
  ): Promise<ActionResult<SearchResult[]>> {
    try {
      // Return immediately if no results
      if (results.length === 0) {
        return ok(results);
      }

      // Check for API key
      const apiKey = process.env.HUGGINGFACE_API_KEY;
      if (!apiKey) {
        // Only log warning once to reduce noise
        if (!RerankerService.apiKeyWarningLogged) {
          logger.warn(
            "HUGGINGFACE_API_KEY not configured, returning original results",
            {
              component: "RerankerService",
              action: "rerank",
            }
          );
          RerankerService.apiKeyWarningLogged = true;
        }
        // Return original results sorted by similarity
        return ok(
          [...results]
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, topK)
        );
      }

      // Cap the number of results sent to HF to reduce cost and noise
      // We'll rerank the top candidates, then slice to topK after
      const resultsToRerank = results.slice(
        0,
        Math.min(results.length, RerankerService.MAX_RESULTS_FOR_RERANKING)
      );

      logger.debug("Re-ranking search results", {
        component: "RerankerService",
        queryLength: query.length,
        resultsCount: results.length,
        resultsToRerank: resultsToRerank.length,
        topK,
      });

      // Prepare pairs for cross-encoder
      const pairs = resultsToRerank.map((result) => ({
        text: query,
        text_pair: result.contentText,
      }));

      // Call cross-encoder API
      const scoresResult = await this.computeScores(pairs, apiKey);

      if (scoresResult.isErr()) {
        // Fallback to original results sorted by similarity
        logger.warn("Re-ranking failed, falling back to original results", {
          component: "RerankerService",
          error: scoresResult.error.message,
        });
        return ok(
          [...results]
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, topK)
        );
      }

      const scores = scoresResult.value;

      // Re-rank based on cross-encoder scores
      const rerankedResults: SearchResult[] = resultsToRerank
        .map((result, index) => ({
          ...result,
          rerankedScore: scores[index],
          originalScore: result.similarity,
        }))
        .sort((a, b) => (b.rerankedScore ?? 0) - (a.rerankedScore ?? 0))
        .slice(0, topK);

      logger.debug("Re-ranking completed", {
        component: "RerankerService",
        originalCount: results.length,
        rerankedCount: rerankedResults.length,
      });

      return ok(rerankedResults);
    } catch (error) {
      logger.error("Unexpected error during re-ranking", {
        component: "RerankerService",
        error: error instanceof Error ? error.message : String(error),
      });
      // Fallback to original results sorted by similarity
      return ok(
        [...results].sort((a, b) => b.similarity - a.similarity).slice(0, topK)
      );
    }
  }

  /**
   * Compute relevance scores using HuggingFace cross-encoder API
   */
  private async computeScores(
    pairs: Array<{ text: string; text_pair: string }>,
    apiKey: string
  ): Promise<ActionResult<number[]>> {
    try {
      const response = await secureFetch(`${this.apiUrl}${this.model}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: pairs }),
        certificateValidation: {
          nearExpiryWarningDays: 30,
          strictValidation: true,
        },
      });

      if (!response.ok) {
        const _errorText = await response.text().catch(() => "Unknown error");
        return err(
          ActionErrors.internal(
            `HuggingFace API error: ${response.status} ${response.statusText}`,
            undefined,
            "RerankerService.computeScores"
          )
        );
      }

      const scores = await response.json();

      // Handle different response formats from HuggingFace API
      // The API might return an array of scores or an array of objects with score property
      const scoreArray: number[] = Array.isArray(scores)
        ? scores.map((s: unknown) => {
            if (typeof s === "number") {
              return s;
            }
            if (typeof s === "object" && s !== null && "score" in s) {
              return typeof (s as { score: unknown }).score === "number"
                ? (s as { score: number }).score
                : 0;
            }
            return 0;
          })
        : [];

      if (scoreArray.length !== pairs.length) {
        return err(
          ActionErrors.internal(
            `Score count mismatch: expected ${pairs.length}, got ${scoreArray.length}`,
            undefined,
            "RerankerService.computeScores"
          )
        );
      }

      return ok(scoreArray);
    } catch (error) {
      logger.error("Error calling HuggingFace API", {
        component: "RerankerService",
        error: error instanceof Error ? error.message : String(error),
      });
      return err(
        ActionErrors.internal(
          "Error calling HuggingFace API",
          error as Error,
          "RerankerService.computeScores"
        )
      );
    }
  }
}

