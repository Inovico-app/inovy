import { CacheTags } from "@/lib/cache-utils";
import { cacheTag } from "next/cache";
import { AIInsightsQueries } from "../data-access/ai-insights.queries";

/**
 * Cached summary queries
 * Uses Next.js 16 cache with tags for invalidation
 */

export interface SummaryContent {
  hoofdonderwerpen: string[];
  beslissingen: string[];
  sprekersBijdragen: {
    spreker: string;
    bijdragen: string[];
  }[];
  belangrijkeQuotes: {
    spreker: string;
    quote: string;
  }[];
}

export interface SummaryResult {
  content: SummaryContent;
  confidence: number;
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
  const insightResult = await AIInsightsQueries.getInsightByType(
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
    };
  }

  return null;
}

