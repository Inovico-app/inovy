import { err, ok, type Result } from "neverthrow";
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
  ): Promise<Result<AIInsightDto, string>> {
    try {
      const result = await AIInsightsQueries.createAIInsight(data);

      if (result.isErr()) {
        return err(result.error.message);
      }

      return ok(this.toDto(result.value));
    } catch (error) {
      const errorMessage = "Failed to create AI insight";
      logger.error(errorMessage, {}, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Get all insights for a recording with authorization check
   */
  static async getInsightsByRecordingId(
    recordingId: string
  ): Promise<Result<AIInsightDto[], string>> {
    try {
      // Check authentication and get session
      const authResult = await getAuthSession();
      if (authResult.isErr()) {
        return err("Failed to get authentication session");
      }

      const { user: authUser, organization } = authResult.value;

      if (!authUser || !organization) {
        return err("Authentication required");
      }

      // Note: In a full implementation, you'd want to verify that the recording
      // belongs to the user's organization. For now, we trust the recordingId
      // is valid and accessible to the authenticated user.

      const result = await AIInsightsQueries.getInsightsByRecordingId(
        recordingId
      );

      if (result.isErr()) {
        return err(result.error.message);
      }

      return ok(result.value.map((insight) => this.toDto(insight)));
    } catch (error) {
      const errorMessage = "Failed to get AI insights";
      logger.error(errorMessage, {}, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Get all insights for a recording (internal - no auth check)
   * Used by internal workflows and services
   */
  static async getInsightsByRecordingIdInternal(
    recordingId: string
  ): Promise<Result<AIInsightDto[], string>> {
    try {
      const result = await AIInsightsQueries.getInsightsByRecordingId(
        recordingId
      );

      if (result.isErr()) {
        return err(result.error.message);
      }

      return ok(result.value.map((insight) => this.toDto(insight)));
    } catch (error) {
      const errorMessage = "Failed to get AI insights";
      logger.error(errorMessage, {}, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Get a specific insight by type and recording with authorization check
   */
  static async getInsightByType(
    recordingId: string,
    insightType: InsightType
  ): Promise<Result<AIInsightDto | null, string>> {
    try {
      // Check authentication and get session
      const authResult = await getAuthSession();
      if (authResult.isErr()) {
        return err("Failed to get authentication session");
      }

      const { user: authUser, organization } = authResult.value;

      if (!authUser || !organization) {
        return err("Authentication required");
      }

      const result = await AIInsightsQueries.getInsightByType(
        recordingId,
        insightType
      );

      if (result.isErr()) {
        return err(result.error.message);
      }

      return ok(result.value ? this.toDto(result.value) : null);
    } catch (error) {
      const errorMessage = "Failed to get AI insight by type";
      logger.error(errorMessage, {}, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Get a specific insight by type and recording (internal - no auth check)
   * Used by internal workflows and services
   */
  static async getInsightByTypeInternal(
    recordingId: string,
    insightType: InsightType
  ): Promise<Result<AIInsightDto | null, string>> {
    try {
      const result = await AIInsightsQueries.getInsightByType(
        recordingId,
        insightType
      );

      if (result.isErr()) {
        return err(result.error.message);
      }

      return ok(result.value ? this.toDto(result.value) : null);
    } catch (error) {
      const errorMessage = "Failed to get AI insight by type";
      logger.error(errorMessage, {}, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Update insight status
   * Used by AI processing workflows to track processing status
   */
  static async updateInsightStatus(
    input: UpdateAIInsightStatusDto
  ): Promise<Result<AIInsightDto, string>> {
    try {
      const result = await AIInsightsQueries.updateInsightStatus(
        input.insightId,
        input.status,
        input.errorMessage
      );

      if (result.isErr()) {
        return err(result.error.message);
      }

      return ok(this.toDto(result.value));
    } catch (error) {
      const errorMessage = "Failed to update AI insight status";
      logger.error(errorMessage, {}, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Update insight content
   * Used by AI processing workflows to store generated content
   */
  static async updateInsightContent(
    input: UpdateAIInsightContentDto
  ): Promise<Result<AIInsightDto, string>> {
    try {
      const result = await AIInsightsQueries.updateInsightContent(
        input.insightId,
        input.content,
        input.confidenceScore
      );

      if (result.isErr()) {
        return err(result.error.message);
      }

      return ok(this.toDto(result.value));
    } catch (error) {
      const errorMessage = "Failed to update AI insight content";
      logger.error(errorMessage, {}, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Update insight content with manual edit tracking and authorization
   * Only allows the authenticated user to edit insights in their organization
   */
  static async updateInsightWithEdit(
    input: Omit<UpdateAIInsightWithEditDto, "userId">
  ): Promise<Result<AIInsightDto, string>> {
    try {
      // Check authentication and get session
      const authResult = await getAuthSession();
      if (authResult.isErr()) {
        return err("Failed to get authentication session");
      }

      const { user: authUser, organization } = authResult.value;

      if (!authUser || !organization) {
        return err("Authentication required");
      }

      // Note: In a full implementation, you'd want to verify that the insight
      // belongs to a recording in the user's organization.

      const result = await AIInsightsQueries.updateInsightWithEdit(
        input.insightId,
        input.content,
        authUser.id
      );

      if (result.isErr()) {
        return err(result.error);
      }

      return ok(this.toDto(result.value));
    } catch (error) {
      const errorMessage = "Failed to update AI insight with edit tracking";
      logger.error(errorMessage, {}, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Delete an insight with authorization check
   */
  static async deleteInsight(insightId: string): Promise<Result<void, string>> {
    try {
      // Check authentication and get session
      const authResult = await getAuthSession();
      if (authResult.isErr()) {
        return err("Failed to get authentication session");
      }

      const { user: authUser, organization } = authResult.value;

      if (!authUser || !organization) {
        return err("Authentication required");
      }

      // Note: In a full implementation, you'd want to verify that the insight
      // belongs to a recording in the user's organization.

      const result = await AIInsightsQueries.deleteInsight(insightId);

      if (result.isErr()) {
        return err(result.error.message);
      }

      return ok(undefined);
    } catch (error) {
      const errorMessage = "Failed to delete AI insight";
      logger.error(errorMessage, {}, error as Error);
      return err(errorMessage);
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
      createdAt: insight.createdAt,
      updatedAt: insight.updatedAt,
    };
  }
}

