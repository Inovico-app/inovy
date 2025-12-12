import { CacheTags } from "@/lib/cache-utils";
import { cacheTag } from "next/cache";
import type { AIInsightDto, InsightType } from "../dto/ai-insight.dto";
import { AIInsightService } from "../services/ai-insight.service";

/**
 * Cached AI insight queries
 * Uses Next.js cache tags for invalidation.
 */
export async function getCachedInsightByTypeInternal(
  recordingId: string,
  insightType: InsightType
): Promise<AIInsightDto | null> {
  "use cache";
  cacheTag(CacheTags.aiInsightByType(recordingId, insightType));

  const result = await AIInsightService.getInsightByTypeInternal(
    recordingId,
    insightType
  );

  return result.isOk() ? result.value : null;
}

