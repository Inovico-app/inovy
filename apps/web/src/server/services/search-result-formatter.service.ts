/**
 * Search Result Formatter Service
 *
 * Provides utilities for formatting search results for LLM consumption:
 * - Sentence-aware truncation (preserves sentence boundaries)
 * - Token counting and limiting
 * - Query term highlighting
 * - Result grouping and prioritization
 */

import { logger } from "@/lib/logger";
import type { SearchResult } from "./rag/types";

// ============================================================================
// Configuration Constants
// ============================================================================

const DEFAULT_MAX_CONTEXT_TOKENS = 4000; // Default token limit for search context
const CHARS_PER_TOKEN = 4; // Approximation: ~4 characters per token (consistent with existing codebase)
const DEFAULT_EXCERPT_MAX_CHARS = 200; // Default max characters for excerpts

// ============================================================================
// Type Definitions
// ============================================================================

export interface FormattingOptions {
  maxTokens?: number;
  maxExcerptChars?: number;
  highlightQueryTerms?: boolean;
  query?: string;
}

export interface TruncatedResult {
  text: string;
  wasTruncated: boolean;
}

// ============================================================================
// SearchResultFormatter Class
// ============================================================================

export class SearchResultFormatter {
  /**
   * Estimate token count for text (approximation: ~4 chars per token)
   * Consistent with ConversationContextManager and RAGService approaches
   */
  static estimateTokenCount(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.length / CHARS_PER_TOKEN);
  }

  /**
   * Truncate text intelligently, preserving sentence boundaries
   *
   * Splits text by sentence boundaries (., !, ?) and preserves complete
   * sentences up to the maximum length. Only adds ellipsis when truncation occurs.
   *
   * @param text - Text to truncate
   * @param maxChars - Maximum characters (default: 200)
   * @returns Truncated text with ellipsis if truncated
   */
  static truncateIntelligently(
    text: string,
    maxChars: number = DEFAULT_EXCERPT_MAX_CHARS
  ): TruncatedResult {
    if (!text || text.length <= maxChars) {
      return { text, wasTruncated: false };
    }

    // Split by sentence boundaries (., !, ? followed by space or end of string)
    // This regex matches sentences ending with . ! or ? followed by whitespace or end of string
    const sentenceRegex = /[^.!?]+[.!?]+(?:\s+|$)/g;
    const sentences = text.match(sentenceRegex) ?? [];

    // If no sentence boundaries found, fall back to simple truncation
    if (sentences.length === 0) {
      return {
        text: text.substring(0, maxChars - 3) + "...",
        wasTruncated: true,
      };
    }

    // Build truncated text by adding complete sentences
    let truncated = "";
    for (const sentence of sentences) {
      const candidate = truncated + sentence.trim();
      if (candidate.length <= maxChars - 3) {
        // -3 for ellipsis
        truncated = candidate;
      } else {
        // Adding this sentence would exceed limit
        break;
      }
    }

    // If truncated is empty but we have sentences, take first sentence (even if truncated)
    if (truncated.length === 0 && sentences.length > 0) {
      const firstSentence = sentences[0]?.trim() || "";
      if (firstSentence.length > maxChars - 3) {
        // Even first sentence is too long, truncate it
        truncated = firstSentence.substring(0, maxChars - 3);
      } else {
        truncated = firstSentence;
      }
    }

    // Determine if truncation occurred and format accordingly
    const wasTruncated = truncated.length < text.length;
    const trimmedTruncated = truncated.trim();
    const finalText = wasTruncated
      ? trimmedTruncated + "..."
      : trimmedTruncated;

    return { text: finalText, wasTruncated };
  }

  /**
   * Highlight query terms in text (for LLM consumption)
   *
   * Wraps matching terms in markdown bold format (**term**)
   * for better LLM readability.
   *
   * @param text - Text to highlight terms in
   * @param query - Query string to extract terms from
   * @returns Text with highlighted query terms
   */
  static highlightQueryTerms(text: string, query: string): string {
    if (!query || !text) return text;

    // Extract meaningful words from query (ignore common stop words)
    const stopWords = new Set([
      "the",
      "a",
      "an",
      "and",
      "or",
      "but",
      "in",
      "on",
      "at",
      "to",
      "for",
      "of",
      "with",
      "by",
      "from",
      "is",
      "are",
      "was",
      "were",
      "be",
      "been",
      "have",
      "has",
      "had",
      "do",
      "does",
      "did",
      "will",
      "would",
      "should",
      "could",
      "may",
      "might",
      "can",
      "must",
    ]);

    // Extract words from query (minimum 3 characters)
    const queryWords = query
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length >= 3 && !stopWords.has(word.toLowerCase()));

    if (queryWords.length === 0) return text;

    // Create regex pattern for matching (case-insensitive, word boundaries)
    const pattern = new RegExp(
      `\\b(${queryWords.map((w) => escapeRegex(w)).join("|")})\\b`,
      "gi"
    );

    // Replace matches with bold markdown
    return text.replace(pattern, "**$1**");
  }

  /**
   * Limit search results by token count while preserving grouping
   *
   * Respects grouping by source document and prioritizes higher-scoring results.
   * Ensures we don't exceed the token limit while maintaining result quality.
   *
   * @param results - Search results to limit
   * @param maxTokens - Maximum tokens allowed (default: 4000)
   * @returns Limited results array
   */
  static limitResultsByTokens(
    results: SearchResult[],
    maxTokens: number = DEFAULT_MAX_CONTEXT_TOKENS
  ): SearchResult[] {
    if (results.length === 0) return results;

    // Calculate token count for each result
    const resultsWithTokens = results.map((result) => ({
      result,
      tokens: this.estimateTokenCount(result.contentText),
      score: result.rerankedScore ?? result.similarity,
    }));

    // Sort by score (descending) to prioritize higher-quality results
    resultsWithTokens.sort((a, b) => b.score - a.score);

    // Group by source document (recordingId or contentId)
    const groups = new Map<string, typeof resultsWithTokens>();
    for (const item of resultsWithTokens) {
      const groupKey =
        item.result.metadata.recordingId ?? item.result.contentId;
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(item);
    }

    // Select results up to token limit, prioritizing groups with higher scores
    const selectedResults: SearchResult[] = [];
    let totalTokens = 0;

    // Sort groups by their highest score
    const sortedGroups = Array.from(groups.entries()).sort(
      (a, b) =>
        Math.max(...b[1].map((r) => r.score)) -
        Math.max(...a[1].map((r) => r.score))
    );

    for (const [, groupItems] of sortedGroups) {
      // Try to add entire group
      const groupTokens = groupItems.reduce(
        (sum, item) => sum + item.tokens,
        0
      );

      if (totalTokens + groupTokens <= maxTokens) {
        // Add entire group
        selectedResults.push(...groupItems.map((item) => item.result));
        totalTokens += groupTokens;
      } else {
        // Add items from group until limit reached
        for (const item of groupItems) {
          if (totalTokens + item.tokens <= maxTokens) {
            selectedResults.push(item.result);
            totalTokens += item.tokens;
          } else {
            break;
          }
        }
        break; // Stop once limit is reached
      }
    }

    // Preserve original order as much as possible (by score)
    selectedResults.sort(
      (a, b) =>
        (b.rerankedScore ?? b.similarity) - (a.rerankedScore ?? a.similarity)
    );

    logger.debug("Limited search results by tokens", {
      component: "SearchResultFormatter",
      originalCount: results.length,
      limitedCount: selectedResults.length,
      originalTokens: resultsWithTokens.reduce(
        (sum, item) => sum + item.tokens,
        0
      ),
      limitedTokens: totalTokens,
      maxTokens,
    });

    return selectedResults;
  }

  /**
   * Format a single search result excerpt with intelligent truncation
   *
   * @param result - Search result to format
   * @param options - Formatting options
   * @returns Formatted excerpt text
   */
  static formatExcerpt(
    result: SearchResult,
    options: FormattingOptions = {}
  ): string {
    const maxChars = options.maxExcerptChars ?? DEFAULT_EXCERPT_MAX_CHARS;
    const { text } = this.truncateIntelligently(result.contentText, maxChars);

    if (options.highlightQueryTerms && options.query) {
      return this.highlightQueryTerms(text, options.query);
    }

    return text;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

