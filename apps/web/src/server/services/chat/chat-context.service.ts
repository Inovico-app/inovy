/**
 * Chat Context Service (internal)
 *
 * Encapsulates RAG context retrieval and source citation formatting.
 * Not exported from the chat module — used only by ChatPipeline.
 */

import { logger } from "@/lib/logger";
import {
  ActionErrors,
  type ActionResult,
} from "@/lib/server-action-client/action-errors";
import { err, ok } from "neverthrow";
import { SearchEngine } from "../knowledge/search-engine";
import { SearchResultFormatter } from "../search-result-formatter.service";
import type { SearchResult } from "../rag/types";
import type { ContentType, ContextWithSources, SourceCitation } from "./types";

// ============================================================================
// Source Description Formatting
// ============================================================================

function getSourceDescription(result: SearchResult): string {
  const title =
    result.metadata.recordingTitle ??
    result.metadata.title ??
    result.metadata.documentTitle ??
    "Unknown";
  const date = result.metadata.recordingDate as string | undefined;

  switch (result.contentType) {
    case "recording":
      return date ? `Recording - ${title} (${date})` : `Recording - ${title}`;
    case "transcription":
      return date
        ? `Transcription - ${title} (${date})`
        : `Transcription - ${title}`;
    case "summary":
      return date ? `Summary - ${title} (${date})` : `Summary - ${title}`;
    case "task":
      return date ? `Task - ${title} (${date})` : `Task - ${title}`;
    case "knowledge_document":
      return `Knowledge Document - ${title}`;
    case "project_template":
      return "Project template";
    case "organization_instructions":
      return "Organization instructions";
    default:
      return String(result.contentType);
  }
}

// ============================================================================
// Context Building
// ============================================================================

function buildContextFromResults(results: SearchResult[]): string {
  if (results.length === 0) {
    return "No relevant information found in the project.";
  }

  const contextParts: string[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const sourceNumber = i + 1;
    const description = getSourceDescription(result);

    contextParts.push(`[${sourceNumber}] ${description}`);
    contextParts.push(result.contentText);
    contextParts.push(""); // Blank line between sources
  }

  return contextParts.join("\n").trim();
}

// ============================================================================
// Source Citation Formatting
// ============================================================================

function formatSourceCitations(
  results: SearchResult[],
  query?: string,
  highlightTerms: boolean = false,
): SourceCitation[] {
  return results.map((result) => {
    const excerpt = SearchResultFormatter.formatExcerpt(result, {
      maxExcerptChars: 200,
      highlightQueryTerms: highlightTerms,
      query,
    });

    if (result.contentType === "knowledge_document") {
      return {
        contentId: result.contentId,
        contentType: result.contentType as ContentType,
        title:
          (result.metadata.documentTitle as string) ||
          (result.metadata.title as string) ||
          "Knowledge Document",
        excerpt,
        similarityScore: result.similarity,
        documentId: result.metadata.documentId as string,
        documentTitle: result.metadata.documentTitle as string,
      };
    }

    return {
      contentId: result.contentId,
      contentType: result.contentType as ContentType,
      title:
        result.metadata.title ?? result.metadata.recordingTitle ?? "Untitled",
      excerpt,
      similarityScore: result.similarity,
      recordingId:
        result.metadata.recordingId ??
        (result.contentType === "transcription" ? result.contentId : undefined),
      timestamp: result.metadata.timestamp,
      recordingDate: result.metadata.recordingDate as string | undefined,
      projectName: result.metadata.projectName as string | undefined,
      projectId: result.metadata.projectId as string | undefined,
    };
  });
}

// ============================================================================
// Public API
// ============================================================================

export class ChatContextService {
  /**
   * Get relevant RAG context for a project-scoped query
   */
  static async getRelevantContext(
    query: string,
    projectId: string,
    options?: { teamId?: string | null; userTeamIds?: string[] },
  ): Promise<ActionResult<ContextWithSources>> {
    try {
      const searchResult = await SearchEngine.searchRaw(
        query,
        {
          organizationId: "",
          projectId,
          teamId: options?.teamId,
          userTeamIds: options?.userTeamIds,
        },
        { limit: 8, scoreThreshold: 0.6, useHybrid: true, useReranking: true },
      );

      if (searchResult.isErr()) {
        return err(searchResult.error);
      }

      const results = searchResult.value;
      const limitedResults = SearchResultFormatter.limitResultsByTokens(
        results,
        4000,
      );
      const context = buildContextFromResults(limitedResults);
      const sources = formatSourceCitations(limitedResults, query, false);

      return ok({ context, sources });
    } catch (error) {
      logger.error("Error getting relevant context", {
        error,
        query,
        projectId,
      });
      return err(
        ActionErrors.internal(
          "Error getting relevant context",
          error as Error,
          "ChatContextService.getRelevantContext",
        ),
      );
    }
  }

  /**
   * Get relevant RAG context for an organization-wide query
   */
  static async getRelevantContextOrganizationWide(
    query: string,
    organizationId: string,
    options?: { teamId?: string | null; userTeamIds?: string[] },
  ): Promise<ActionResult<ContextWithSources>> {
    try {
      const searchResult = await SearchEngine.searchRaw(
        query,
        {
          organizationId,
          teamId: options?.teamId,
          userTeamIds: options?.userTeamIds,
        },
        {
          limit: 12,
          scoreThreshold: 0.6,
          useHybrid: false,
          useReranking: true,
        },
      );

      if (searchResult.isErr()) {
        return err(searchResult.error);
      }

      const results = searchResult.value;
      const limitedResults = SearchResultFormatter.limitResultsByTokens(
        results,
        4000,
      );
      const context = buildContextFromResults(limitedResults);
      const sources = formatSourceCitations(limitedResults, query, false).map(
        (source) => ({
          ...source,
          projectId: limitedResults.find(
            (r) => r.contentId === source.contentId,
          )?.metadata.projectId as string | undefined,
        }),
      );

      return ok({ context, sources });
    } catch (error) {
      logger.error("Error getting organization-wide relevant context", {
        error,
        query,
        organizationId,
      });
      return err(
        ActionErrors.internal(
          "Error getting organization-wide relevant context",
          error as Error,
          "ChatContextService.getRelevantContextOrganizationWide",
        ),
      );
    }
  }
}
