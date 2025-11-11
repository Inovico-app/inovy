import type {
  InsightProcessingStatus,
  InsightType,
} from "../db/schema/ai-insights";

interface Speaker {
  id: number;
  name?: string;
  utterances: number;
}

interface Utterance {
  speaker: number;
  text: string;
  start: number;
  end: number;
  confidence: number;
}

/**
 * AI Insight DTO
 * Represents an AI-generated insight from a recording
 */
export interface AIInsightDto {
  id: string;
  recordingId: string;
  insightType: InsightType;
  content: Record<string, unknown>;
  confidenceScore: number | null;
  processingStatus: InsightProcessingStatus;
  speakersDetected: number | null;
  utterances: Utterance[] | null;
  speakerNames: Record<string, string> | null;
  errorMessage: string | null;
  isManuallyEdited: boolean;
  lastEditedById: string | null;
  lastEditedAt: Date | null;
  userNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * AI Insight filters for querying
 */
export interface AIInsightFiltersDto {
  recordingId?: string;
  insightType?: InsightType;
  processingStatus?: InsightProcessingStatus;
}

/**
 * Update AI Insight content DTO
 */
export interface UpdateAIInsightContentDto {
  insightId: string;
  content: Record<string, unknown>;
  confidenceScore?: number;
}

/**
 * Update AI Insight status DTO
 */
export interface UpdateAIInsightStatusDto {
  insightId: string;
  status: InsightProcessingStatus;
  errorMessage?: string;
}

/**
 * AI Insight with edit tracking DTO
 */
export interface UpdateAIInsightWithEditDto {
  insightId: string;
  content: Record<string, unknown>;
  userId: string;
}

/**
 * Export types for use in other modules
 */
export type { InsightProcessingStatus, InsightType, Speaker, Utterance };

