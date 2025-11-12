"use cache";

import { CacheTags } from "@/lib/cache-utils";
import { cacheTag } from "next/cache";
import { SummaryEditService } from "../services/summary-edit.service";
import { TranscriptionEditService } from "../services/transcription-edit.service";

/**
 * Cached history queries
 * Uses Next.js 16 cache with tags for invalidation
 */

/**
 * Get transcription history for a recording (cached)
 * Calls TranscriptionEditService which includes business logic
 */
export async function getCachedTranscriptionHistory(
  recordingId: string,
  organizationId: string
) {
  "use cache";
  cacheTag(CacheTags.transcriptionHistory(recordingId));
  return await TranscriptionEditService.getTranscriptionHistory(
    recordingId,
    organizationId
  );
}

/**
 * Get summary history for a recording (cached)
 * Calls SummaryEditService which includes business logic
 */
export async function getCachedSummaryHistory(
  recordingId: string,
  organizationId: string
) {
  "use cache";
  cacheTag(CacheTags.summaryHistory(recordingId));
  return await SummaryEditService.getSummaryHistory(recordingId, organizationId);
}

