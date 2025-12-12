import { CacheTags } from "@/lib/cache-utils";
import { cacheTag } from "next/cache";
import { SummaryEditService } from "../services/summary-edit.service";
import { TranscriptionEditService } from "../services/transcription-edit.service";

/**
 * Cached history queries
 * Uses Next.js 16 cache with tags for invalidation
 */

export interface TranscriptionHistoryEntry {
  id: string;
  versionNumber: number;
  content: string;
  editedById: string;
  editedAt: Date;
  changeDescription: string | null;
}

export interface SummaryHistoryEntry {
  id: string;
  versionNumber: number;
  content: Record<string, unknown>;
  editedById: string;
  editedAt: Date;
  changeDescription: string | null;
}

/**
 * Get transcription history for a recording (cached)
 * Calls TranscriptionEditService which includes business logic
 */
export async function getCachedTranscriptionHistory(
  recordingId: string,
  organizationId: string
): Promise<TranscriptionHistoryEntry[]> {
  "use cache";
  cacheTag(CacheTags.transcriptionHistory(recordingId));
  const result = await TranscriptionEditService.getTranscriptionHistory(
    recordingId,
    organizationId
  );
  return result.isOk() ? result.value : [];
}

/**
 * Get summary history for a recording (cached)
 * Calls SummaryEditService which includes business logic
 */
export async function getCachedSummaryHistory(
  recordingId: string,
  organizationId: string
): Promise<SummaryHistoryEntry[]> {
  "use cache";
  cacheTag(CacheTags.summaryHistory(recordingId));
  const result = await SummaryEditService.getSummaryHistory(
    recordingId,
    organizationId
  );
  return result.isOk() ? result.value : [];
}

