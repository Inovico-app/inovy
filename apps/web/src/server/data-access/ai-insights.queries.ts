import { db } from "@/server/db";
import { aiInsights, type NewAIInsight, type AIInsight } from "@/server/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { err, ok, type Result } from "neverthrow";
import { logger } from "@/lib/logger";

export class AIInsightsQueries {
  /**
   * Create a new AI insight
   */
  static async createAIInsight(
    data: NewAIInsight
  ): Promise<Result<AIInsight, Error>> {
    try {
      const [insight] = await db
        .insert(aiInsights)
        .values({
          ...data,
          updatedAt: new Date(),
        })
        .returning();

      logger.info("AI insight created", {
        component: "AIInsightsQueries.createAIInsight",
        insightId: insight.id,
        recordingId: data.recordingId,
        insightType: data.insightType,
      });

      return ok(insight);
    } catch (error) {
      logger.error("Failed to create AI insight", {
        component: "AIInsightsQueries.createAIInsight",
        error,
      });
      return err(
        error instanceof Error ? error : new Error("Failed to create AI insight")
      );
    }
  }

  /**
   * Get all insights for a recording
   */
  static async getInsightsByRecordingId(
    recordingId: string
  ): Promise<Result<AIInsight[], Error>> {
    try {
      const insights = await db
        .select()
        .from(aiInsights)
        .where(eq(aiInsights.recordingId, recordingId))
        .orderBy(desc(aiInsights.createdAt));

      return ok(insights);
    } catch (error) {
      logger.error("Failed to fetch AI insights", {
        component: "AIInsightsQueries.getInsightsByRecordingId",
        recordingId,
        error,
      });
      return err(
        error instanceof Error ? error : new Error("Failed to fetch AI insights")
      );
    }
  }

  /**
   * Get a specific insight by type and recording
   */
  static async getInsightByType(
    recordingId: string,
    insightType: "transcription" | "summary" | "action_items" | "decisions" | "risks" | "next_steps"
  ): Promise<Result<AIInsight | null, Error>> {
    try {
      const [insight] = await db
        .select()
        .from(aiInsights)
        .where(
          and(
            eq(aiInsights.recordingId, recordingId),
            eq(aiInsights.insightType, insightType)
          )
        )
        .limit(1);

      return ok(insight ?? null);
    } catch (error) {
      logger.error("Failed to fetch AI insight by type", {
        component: "AIInsightsQueries.getInsightByType",
        recordingId,
        insightType,
        error,
      });
      return err(
        error instanceof Error
          ? error
          : new Error("Failed to fetch AI insight by type")
      );
    }
  }

  /**
   * Update insight status
   */
  static async updateInsightStatus(
    insightId: string,
    status: "pending" | "processing" | "completed" | "failed",
    errorMessage?: string
  ): Promise<Result<AIInsight, Error>> {
    try {
      const [updated] = await db
        .update(aiInsights)
        .set({
          processingStatus: status,
          errorMessage,
          updatedAt: new Date(),
        })
        .where(eq(aiInsights.id, insightId))
        .returning();

      logger.info("AI insight status updated", {
        component: "AIInsightsQueries.updateInsightStatus",
        insightId,
        status,
      });

      return ok(updated);
    } catch (error) {
      logger.error("Failed to update AI insight status", {
        component: "AIInsightsQueries.updateInsightStatus",
        insightId,
        error,
      });
      return err(
        error instanceof Error
          ? error
          : new Error("Failed to update AI insight status")
      );
    }
  }

  /**
   * Update insight content
   */
  static async updateInsightContent(
    insightId: string,
    content: Record<string, unknown>,
    confidenceScore?: number
  ): Promise<Result<AIInsight, Error>> {
    try {
      const [updated] = await db
        .update(aiInsights)
        .set({
          content,
          confidenceScore,
          processingStatus: "completed",
          updatedAt: new Date(),
        })
        .where(eq(aiInsights.id, insightId))
        .returning();

      logger.info("AI insight content updated", {
        component: "AIInsightsQueries.updateInsightContent",
        insightId,
      });

      return ok(updated);
    } catch (error) {
      logger.error("Failed to update AI insight content", {
        component: "AIInsightsQueries.updateInsightContent",
        insightId,
        error,
      });
      return err(
        error instanceof Error
          ? error
          : new Error("Failed to update AI insight content")
      );
    }
  }

  /**
   * Delete an insight
   */
  static async deleteInsight(
    insightId: string
  ): Promise<Result<void, Error>> {
    try {
      await db.delete(aiInsights).where(eq(aiInsights.id, insightId));

      logger.info("AI insight deleted", {
        component: "AIInsightsQueries.deleteInsight",
        insightId,
      });

      return ok(undefined);
    } catch (error) {
      logger.error("Failed to delete AI insight", {
        component: "AIInsightsQueries.deleteInsight",
        insightId,
        error,
      });
      return err(
        error instanceof Error ? error : new Error("Failed to delete AI insight")
      );
    }
  }
}

