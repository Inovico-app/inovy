import { db } from "@/server/db";
import {
  aiInsights,
  type AIInsight,
  type NewAIInsight,
} from "@/server/db/schema";
import { and, desc, eq } from "drizzle-orm";

export class AIInsightsQueries {
  static async createAIInsight(data: NewAIInsight): Promise<AIInsight> {
    const [insight] = await db
      .insert(aiInsights)
      .values({ ...data, updatedAt: new Date() })
      .returning();
    return insight;
  }

  static async getInsightsByRecordingId(
    recordingId: string
  ): Promise<AIInsight[]> {
    return await db
      .select()
      .from(aiInsights)
      .where(eq(aiInsights.recordingId, recordingId))
      .orderBy(desc(aiInsights.createdAt));
  }

  static async getInsightByType(
    recordingId: string,
    insightType:
      | "transcription"
      | "summary"
      | "action_items"
      | "decisions"
      | "risks"
      | "next_steps"
  ): Promise<AIInsight | null> {
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
    return insight ?? null;
  }

  static async updateInsightStatus(
    insightId: string,
    status: "pending" | "processing" | "completed" | "failed",
    errorMessage?: string
  ): Promise<AIInsight | undefined> {
    const [updated] = await db
      .update(aiInsights)
      .set({ processingStatus: status, errorMessage, updatedAt: new Date() })
      .where(eq(aiInsights.id, insightId))
      .returning();
    return updated;
  }

  static async updateInsightContent(
    insightId: string,
    content: Record<string, unknown>,
    confidenceScore?: number
  ): Promise<AIInsight | undefined> {
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
    return updated;
  }

  static async updateInsightWithEdit(
    insightId: string,
    content: Record<string, unknown>,
    userId: string
  ): Promise<AIInsight | undefined> {
    const [updated] = await db
      .update(aiInsights)
      .set({
        content,
        isManuallyEdited: true,
        lastEditedById: userId,
        lastEditedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(aiInsights.id, insightId))
      .returning();
    return updated;
  }

  static async deleteInsight(insightId: string): Promise<void> {
    await db.delete(aiInsights).where(eq(aiInsights.id, insightId));
  }
}

