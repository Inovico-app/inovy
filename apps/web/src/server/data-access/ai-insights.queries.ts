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
    speakerNames: Record<string, string>,
    speakerUserIds?: Record<string, string> | null
  ): Promise<AIInsight | undefined> {
    const updateData: {
      speakerNames: Record<string, string>;
      speakerUserIds?: Record<string, string> | null;
      updatedAt: Date;
    } = {
      speakerNames,
      updatedAt: new Date(),
    };

    if (speakerUserIds !== undefined) {
      updateData.speakerUserIds = speakerUserIds;
    }

    const [updated] = await db
      .update(aiInsights)
      .set(updateData)
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

  /**
   * Update speaker for a specific utterance in the utterances array
   * Uses a transaction to ensure atomic read-modify-write and prevent race conditions
   */
  static async updateUtteranceSpeaker(
    insightId: string,
    utteranceIndex: number,
    newSpeaker: number,
    userId: string
  ): Promise<AIInsight | undefined> {
    return await db.transaction(async (tx) => {
      // Get current insight to access utterances array within transaction
      const [insight] = await tx
        .select()
        .from(aiInsights)
        .where(eq(aiInsights.id, insightId))
        .limit(1);

      if (!insight) {
        return undefined;
      }

      // Validate utterances array exists and index is valid
      if (!insight.utterances || insight.utterances.length === 0) {
        return undefined;
      }

      if (utteranceIndex < 0 || utteranceIndex >= insight.utterances.length) {
        return undefined;
      }

      // Create updated utterances array with new speaker value
      const updatedUtterances = [...insight.utterances];
      updatedUtterances[utteranceIndex] = {
        ...updatedUtterances[utteranceIndex],
        speaker: newSpeaker,
      };

      // Update the insight with new utterances array within the same transaction
      const [updated] = await tx
        .update(aiInsights)
        .set({
          utterances: updatedUtterances,
          isManuallyEdited: true,
          lastEditedById: userId,
          lastEditedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(aiInsights.id, insightId))
        .returning();

      return updated;
    });
  }
}

