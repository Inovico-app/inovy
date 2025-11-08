import { CacheTags } from "@/lib/cache-utils";
import { cacheTag } from "next/cache";
import { AIInsightService } from "../services/ai-insight.service";

/**
 * Cached summary queries
 * Uses Next.js 16 cache with tags for invalidation
 */

export interface SummaryContent {
  overview: string;
  topics: string[];
  decisions: string[];
  speakerContributions: {
    speaker: string;
    contributions: string[];
  }[];
  importantQuotes: {
    speaker: string;
    quote: string;
  }[];
}

export interface SummaryResult {
  content: SummaryContent;
  confidence: number;
  userNotes?: string | null;
  isManuallyEdited?: boolean;
  lastEditedById?: string | null;
  lastEditedAt?: Date | null;
}

/**
 * Get cached summary from database
 */
export async function getCachedSummary(
  recordingId: string
): Promise<SummaryResult | null> {
  "use cache";
  cacheTag(CacheTags.summary(recordingId));

  // Check if we have an existing summary in the database
  const insightResult = await AIInsightService.getInsightByTypeInternal(
    recordingId,
    "summary"
  );

  if (insightResult.isErr() || !insightResult.value) {
    return null;
  }

  const insight = insightResult.value;

  if (insight.processingStatus === "completed" && insight.content) {
    return {
      content: insight.content as unknown as SummaryContent,
      confidence: insight.confidenceScore ?? 0.85,
      userNotes: insight.userNotes,
      isManuallyEdited: insight.isManuallyEdited,
      lastEditedById: insight.lastEditedById,
      lastEditedAt: insight.lastEditedAt,
    };
  }

  return null;
}

