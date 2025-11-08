import { err, ok } from "neverthrow";
import { ActionErrors, type ActionResult } from "../../lib/action-errors";
import { getAuthSession } from "../../lib/auth";
import { logger } from "../../lib/logger";
import { AIInsightsQueries } from "../data-access/ai-insights.queries";
import type { AIInsight, NewAIInsight } from "../db/schema";
import type {
  AIInsightDto,
  InsightType,
  UpdateAIInsightContentDto,
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
    recordingId: string
  ): Promise<ActionResult<AIInsightDto[]>> {
    try {
      const authResult = await getAuthSession();
      if (authResult.isErr()) {
        return err(
          ActionErrors.internal(
            "Failed to get authentication session",
            undefined,
            "AIInsightService.getInsightsByRecordingId"
          )
        );
      }

      const { user: authUser, organization } = authResult.value;

      if (!authUser || !organization) {
        return err(
          ActionErrors.forbidden(
            "Authentication required",
            undefined,
            "AIInsightService.getInsightsByRecordingId"
          )
        );
      }

      const insights = await AIInsightsQueries.getInsightsByRecordingId(
        recordingId
      );

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
      const insights = await AIInsightsQueries.getInsightsByRecordingId(
        recordingId
      );

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
    insightType: InsightType
  ): Promise<ActionResult<AIInsightDto | null>> {
    try {
      const authResult = await getAuthSession();
      if (authResult.isErr()) {
        return err(
          ActionErrors.internal(
            "Failed to get authentication session",
            undefined,
            "AIInsightService.getInsightByType"
          )
        );
      }

      const { user: authUser, organization } = authResult.value;

      if (!authUser || !organization) {
        return err(
          ActionErrors.forbidden(
            "Authentication required",
            undefined,
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
    input: UpdateAIInsightContentDto
  ): Promise<ActionResult<AIInsightDto>> {
    try {
      const insight = await AIInsightsQueries.updateInsightContent(
        input.insightId,
        input.content,
        input.confidenceScore
      );

      if (!insight) {
        return err(
          ActionErrors.notFound(
            "AI Insight",
            "AIInsightService.updateInsightContent"
          )
        );
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
    input: Omit<UpdateAIInsightWithEditDto, "userId">
  ): Promise<ActionResult<AIInsightDto>> {
    try {
      const authResult = await getAuthSession();
      if (authResult.isErr()) {
        return err(
          ActionErrors.internal(
            "Failed to get authentication session",
            undefined,
            "AIInsightService.updateInsightWithEdit"
          )
        );
      }

      const { user: authUser, organization } = authResult.value;

      if (!authUser || !organization) {
        return err(
          ActionErrors.forbidden(
            "Authentication required",
            undefined,
            "AIInsightService.updateInsightWithEdit"
          )
        );
      }

      const insight = await AIInsightsQueries.updateInsightWithEdit(
        input.insightId,
        input.content,
        authUser.id
      );

      if (!insight) {
        return err(
          ActionErrors.notFound(
            "AI Insight",
            "AIInsightService.updateInsightWithEdit"
          )
        );
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
   * Delete an insight with authorization check
   */
  static async deleteInsight(insightId: string): Promise<ActionResult<void>> {
    try {
      const authResult = await getAuthSession();
      if (authResult.isErr()) {
        return err(
          ActionErrors.internal(
            "Failed to get authentication session",
            undefined,
            "AIInsightService.deleteInsight"
          )
        );
      }

      const { user: authUser, organization } = authResult.value;

      if (!authUser || !organization) {
        return err(
          ActionErrors.forbidden(
            "Authentication required",
            undefined,
            "AIInsightService.deleteInsight"
          )
        );
      }

      await AIInsightsQueries.deleteInsight(insightId);

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
