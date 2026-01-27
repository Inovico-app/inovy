import { err, ok } from "neverthrow";
import { CacheInvalidation } from "../../lib/cache-utils";
import { logger } from "../../lib/logger";
import { assertOrganizationAccess } from "../../lib/rbac/organization-isolation";
import {
  ActionErrors,
  type ActionResult,
} from "../../lib/server-action-client/action-errors";
import { AIInsightsQueries } from "../data-access/ai-insights.queries";
import { RecordingsQueries } from "../data-access/recordings.queries";
import type { AIInsight, NewAIInsight } from "../db/schema/ai-insights";
import type {
  AIInsightDto,
  InsightType,
  UpdateAIInsightStatusDto,
  UpdateAIInsightWithEditDto,
} from "../dto/ai-insight.dto";

/**
 * Business logic layer for AI Insight operations
 * Orchestrates data access and handles business rules
 */
export class AIInsightService {
  /**
   * Create a new AI insight
   * Used by AI processing workflows to store insights
   */
  static async createAIInsight(
    data: NewAIInsight
  ): Promise<ActionResult<AIInsightDto>> {
    try {
      const insight = await AIInsightsQueries.createAIInsight(data);
      return ok(this.toDto(insight));
    } catch (error) {
      logger.error("Failed to create AI insight", {}, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to create AI insight",
          error as Error,
          "AIInsightService.createAIInsight"
        )
      );
    }
  }

  /**
   * Get all insights for a recording with authorization check
   */
  static async getInsightsByRecordingId(
    recordingId: string,
    organizationId: string
  ): Promise<ActionResult<AIInsightDto[]>> {
    try {
      // Verify recording belongs to organization
      const recording =
        await RecordingsQueries.selectRecordingById(recordingId);
      if (!recording) {
        return err(
          ActionErrors.notFound(
            "Recording",
            "AIInsightService.getInsightsByRecordingId"
          )
        );
      }

      try {
        assertOrganizationAccess(
          recording.organizationId,
          organizationId,
          "AIInsightService.getInsightsByRecordingId"
        );
      } catch (_error) {
        return err(
          ActionErrors.notFound(
            "Recording not found",
            "AIInsightService.getInsightsByRecordingId"
          )
        );
      }

      const insights =
        await AIInsightsQueries.getInsightsByRecordingId(recordingId);

      return ok(insights.map((insight) => this.toDto(insight)));
    } catch (error) {
      logger.error("Failed to get AI insights", {}, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to get AI insights",
          error as Error,
          "AIInsightService.getInsightsByRecordingId"
        )
      );
    }
  }

  /**
   * Get all insights for a recording (internal - no auth check)
   * Used by internal workflows and services
   */
  static async getInsightsByRecordingIdInternal(
    recordingId: string
  ): Promise<ActionResult<AIInsightDto[]>> {
    try {
      const insights =
        await AIInsightsQueries.getInsightsByRecordingId(recordingId);

      return ok(insights.map((insight) => this.toDto(insight)));
    } catch (error) {
      logger.error("Failed to get AI insights", {}, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to get AI insights",
          error as Error,
          "AIInsightService.getInsightsByRecordingIdInternal"
        )
      );
    }
  }

  /**
   * Get a specific insight by type and recording with authorization check
   */
  static async getInsightByType(
    recordingId: string,
    insightType: InsightType,
    organizationId: string
  ): Promise<ActionResult<AIInsightDto | null>> {
    try {
      // Verify recording belongs to organization
      const recording =
        await RecordingsQueries.selectRecordingById(recordingId);
      if (!recording) {
        return err(
          ActionErrors.notFound(
            "Recording",
            "AIInsightService.getInsightByType"
          )
        );
      }

      try {
        assertOrganizationAccess(
          recording.organizationId,
          organizationId,
          "AIInsightService.getInsightByType"
        );
      } catch (_error) {
        return err(
          ActionErrors.notFound(
            "Recording not found",
            "AIInsightService.getInsightByType"
          )
        );
      }

      const insight = await AIInsightsQueries.getInsightByType(
        recordingId,
        insightType
      );

      return ok(insight ? this.toDto(insight) : null);
    } catch (error) {
      logger.error("Failed to get AI insight by type", {}, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to get AI insight by type",
          error as Error,
          "AIInsightService.getInsightByType"
        )
      );
    }
  }

  /**
   * Get a specific insight by type and recording (internal - no auth check)
   * Used by internal workflows and services
   */
  static async getInsightByTypeInternal(
    recordingId: string,
    insightType: InsightType
  ): Promise<ActionResult<AIInsightDto | null>> {
    try {
      const insight = await AIInsightsQueries.getInsightByType(
        recordingId,
        insightType
      );

      return ok(insight ? this.toDto(insight) : null);
    } catch (error) {
      logger.error("Failed to get AI insight by type", {}, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to get AI insight by type",
          error as Error,
          "AIInsightService.getInsightByTypeInternal"
        )
      );
    }
  }

  /**
   * Update insight status
   * Used by AI processing workflows to track processing status
   */
  static async updateInsightStatus(
    input: UpdateAIInsightStatusDto
  ): Promise<ActionResult<AIInsightDto>> {
    try {
      const insight = await AIInsightsQueries.updateInsightStatus(
        input.insightId,
        input.status,
        input.errorMessage
      );

      if (!insight) {
        return err(
          ActionErrors.notFound(
            "AI Insight",
            "AIInsightService.updateInsightStatus"
          )
        );
      }

      CacheInvalidation.invalidateAIInsightByType(
        insight.recordingId,
        insight.insightType
      );
      if (insight.insightType === "summary") {
        CacheInvalidation.invalidateSummary(insight.recordingId);
      }

      return ok(this.toDto(insight));
    } catch (error) {
      logger.error("Failed to update AI insight status", {}, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to update AI insight status",
          error as Error,
          "AIInsightService.updateInsightStatus"
        )
      );
    }
  }

  /**
   * Update insight content
   * Used by AI processing workflows to store generated content
   */
  static async updateInsightContent(
    input: Partial<Omit<NewAIInsight, "id" | "createdAt" | "updatedAt">> & {
      id: string;
    }
  ): Promise<ActionResult<AIInsightDto>> {
    try {
      const insight = await AIInsightsQueries.updateInsightContent(input.id, {
        content: input.content,
        confidenceScore: input.confidenceScore,
      });

      if (!insight) {
        return err(
          ActionErrors.notFound(
            "AI Insight",
            "AIInsightService.updateInsightContent"
          )
        );
      }

      CacheInvalidation.invalidateAIInsightByType(
        insight.recordingId,
        insight.insightType
      );
      if (insight.insightType === "summary") {
        CacheInvalidation.invalidateSummary(insight.recordingId);
      }

      return ok(this.toDto(insight));
    } catch (error) {
      logger.error("Failed to update AI insight content", {}, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to update AI insight content",
          error as Error,
          "AIInsightService.updateInsightContent"
        )
      );
    }
  }

  /**
   * Update insight content with manual edit tracking and authorization
   */
  static async updateInsightWithEdit(
    input: Omit<UpdateAIInsightWithEditDto, "userId">,
    userId: string,
    organizationId: string
  ): Promise<ActionResult<AIInsightDto>> {
    try {
      // Get insight first to verify it exists and get its recording
      const existingInsight = await AIInsightsQueries.getInsightById(
        input.insightId
      );
      if (!existingInsight) {
        return err(
          ActionErrors.notFound(
            "AI Insight",
            "AIInsightService.updateInsightWithEdit"
          )
        );
      }

      // Verify recording belongs to organization
      const recording = await RecordingsQueries.selectRecordingById(
        existingInsight.recordingId
      );
      if (!recording) {
        return err(
          ActionErrors.notFound(
            "Recording",
            "AIInsightService.updateInsightWithEdit"
          )
        );
      }

      try {
        assertOrganizationAccess(
          recording.organizationId,
          organizationId,
          "AIInsightService.updateInsightWithEdit"
        );
      } catch (_error) {
        return err(
          ActionErrors.notFound(
            "AI Insight not found",
            "AIInsightService.updateInsightWithEdit"
          )
        );
      }

      const insight = await AIInsightsQueries.updateInsightWithEdit(
        input.insightId,
        input.content,
        userId
      );

      if (!insight) {
        return err(
          ActionErrors.notFound(
            "AI Insight",
            "AIInsightService.updateInsightWithEdit"
          )
        );
      }

      CacheInvalidation.invalidateAIInsightByType(
        insight.recordingId,
        insight.insightType
      );
      if (insight.insightType === "summary") {
        CacheInvalidation.invalidateSummary(insight.recordingId);
      }

      return ok(this.toDto(insight));
    } catch (error) {
      logger.error(
        "Failed to update AI insight with edit tracking",
        {},
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to update AI insight with edit tracking",
          error as Error,
          "AIInsightService.updateInsightWithEdit"
        )
      );
    }
  }

  /**
   * Update speaker names for a transcription insight with authorization check
   * Used to customize speaker labels in transcriptions
   */
  static async updateSpeakerNames(
    recordingId: string,
    speakerNames: Record<string, string>,
    organizationId: string,
    speakerUserIds?: Record<string, string> | null
  ): Promise<ActionResult<AIInsightDto>> {
    try {
      // Verify recording belongs to organization
      const recording =
        await RecordingsQueries.selectRecordingById(recordingId);
      if (!recording) {
        return err(
          ActionErrors.notFound(
            "Recording",
            "AIInsightService.updateSpeakerNames"
          )
        );
      }

      try {
        assertOrganizationAccess(
          recording.organizationId,
          organizationId,
          "AIInsightService.updateSpeakerNames"
        );
      } catch (_error) {
        return err(
          ActionErrors.notFound(
            "Recording not found",
            "AIInsightService.updateSpeakerNames"
          )
        );
      }

      // Get the transcription insight for this recording
      const insight =
        await AIInsightsQueries.getTranscriptionInsightByRecordingId(
          recordingId
        );

      if (!insight) {
        return err(
          ActionErrors.notFound(
            "Transcription not found",
            "AIInsightService.updateSpeakerNames"
          )
        );
      }

      // Update the speaker names and user IDs
      const updated = await AIInsightsQueries.updateSpeakerNames(
        insight.id,
        speakerNames,
        speakerUserIds
      );

      if (!updated) {
        return err(
          ActionErrors.notFound(
            "AI Insight",
            "AIInsightService.updateSpeakerNames"
          )
        );
      }

      CacheInvalidation.invalidateAIInsightByType(
        updated.recordingId,
        updated.insightType
      );

      return ok(this.toDto(updated));
    } catch (error) {
      logger.error("Failed to update speaker names", {}, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to update speaker names",
          error as Error,
          "AIInsightService.updateSpeakerNames"
        )
      );
    }
  }

  /**
   * Delete an insight with authorization check
   */
  static async deleteInsight(
    insightId: string,
    organizationId: string
  ): Promise<ActionResult<void>> {
    try {
      // Get insight first to verify it exists and get its recording
      const insight = await AIInsightsQueries.getInsightById(insightId);
      if (!insight) {
        return err(
          ActionErrors.notFound("AI Insight", "AIInsightService.deleteInsight")
        );
      }

      // Verify recording belongs to organization
      const recording = await RecordingsQueries.selectRecordingById(
        insight.recordingId
      );
      if (!recording) {
        return err(
          ActionErrors.notFound("Recording", "AIInsightService.deleteInsight")
        );
      }

      try {
        assertOrganizationAccess(
          recording.organizationId,
          organizationId,
          "AIInsightService.deleteInsight"
        );
      } catch (_error) {
        return err(
          ActionErrors.notFound(
            "AI Insight not found",
            "AIInsightService.deleteInsight"
          )
        );
      }

      await AIInsightsQueries.deleteInsight(insightId);

      CacheInvalidation.invalidateAIInsightByType(
        insight.recordingId,
        insight.insightType
      );
      if (insight.insightType === "summary") {
        CacheInvalidation.invalidateSummary(insight.recordingId);
      }

      return ok(undefined);
    } catch (error) {
      logger.error("Failed to delete AI insight", {}, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to delete AI insight",
          error as Error,
          "AIInsightService.deleteInsight"
        )
      );
    }
  }

  /**
   * Convert database AI insight to DTO
   */
  private static toDto(insight: AIInsight): AIInsightDto {
    return {
      id: insight.id,
      recordingId: insight.recordingId,
      insightType: insight.insightType,
      content: insight.content,
      confidenceScore: insight.confidenceScore,
      processingStatus: insight.processingStatus,
      speakersDetected: insight.speakersDetected,
      utterances: insight.utterances,
      speakerNames: insight.speakerNames as Record<string, string> | null,
      speakerUserIds: insight.speakerUserIds as Record<string, string> | null,
      errorMessage: insight.errorMessage,
      isManuallyEdited: insight.isManuallyEdited,
      lastEditedById: insight.lastEditedById,
      lastEditedAt: insight.lastEditedAt,
      userNotes: insight.userNotes,
      createdAt: insight.createdAt,
      updatedAt: insight.updatedAt,
    };
  }
}

