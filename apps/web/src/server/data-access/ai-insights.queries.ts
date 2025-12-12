import { db } from "@/server/db";
import {
  aiInsights,
  type AIInsight,
  type NewAIInsight,
} from "@/server/db/schema/ai-insights";
import { and, desc, eq, inArray } from "drizzle-orm";

export class AIInsightsQueries {
  static async createAIInsight(data: NewAIInsight): Promise<AIInsight> {
    const [insight] = await db
      .insert(aiInsights)
      .values({ ...data, updatedAt: new Date() })
      .returning();
    return insight;
  }

  static async getInsightById(insightId: string): Promise<AIInsight | null> {
    const [insight] = await db
      .select()
      .from(aiInsights)
      .where(eq(aiInsights.id, insightId))
      .limit(1);
    return insight ?? null;
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

  static async getInsightsByRecordingIds(
    recordingIds: string[]
  ): Promise<AIInsight[]> {
    if (recordingIds.length === 0) {
      return [];
    }
    return await db
      .select()
      .from(aiInsights)
      .where(inArray(aiInsights.recordingId, recordingIds))
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
    data: Partial<Omit<NewAIInsight, "id" | "createdAt" | "updatedAt">>
  ): Promise<AIInsight | undefined> {
    const [updated] = await db
      .update(aiInsights)
      .set({
        ...data,
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

  static async updateUserNotes(
    insightId: string,
    userNotes: string,
    userId: string
  ): Promise<AIInsight | undefined> {
    const [updated] = await db
      .update(aiInsights)
      .set({
        userNotes,
        isManuallyEdited: true,
        lastEditedById: userId,
        lastEditedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(aiInsights.id, insightId))
      .returning();
    return updated;
  }

  static async updateSpeakerNames(
    insightId: string,
    speakerNames: Record<string, string>
  ): Promise<AIInsight | undefined> {
    const [updated] = await db
      .update(aiInsights)
      .set({
        speakerNames,
        updatedAt: new Date(),
      })
      .where(eq(aiInsights.id, insightId))
      .returning();
    return updated;
  }

  /**
   * Update speaker names and clear last edited info (for anonymization)
   */
  static async anonymizeSpeakerNames(
    insightId: string,
    speakerNames: Record<string, string>
  ): Promise<AIInsight | undefined> {
    const [updated] = await db
      .update(aiInsights)
      .set({
        speakerNames,
        lastEditedById: null,
        updatedAt: new Date(),
      })
      .where(eq(aiInsights.id, insightId))
      .returning();
    return updated;
  }

  static async getTranscriptionInsightByRecordingId(
    recordingId: string
  ): Promise<AIInsight | null> {
    const [insight] = await db
      .select()
      .from(aiInsights)
      .where(
        and(
          eq(aiInsights.recordingId, recordingId),
          eq(aiInsights.insightType, "transcription")
        )
      )
      .limit(1);
    return insight ?? null;
  }
}

