import { db } from "@/server/db";
import {
  reprocessingHistory,
  type NewReprocessingHistory,
  type ReprocessingHistory,
} from "@/server/db/schema/reprocessing-history";
import { desc, eq } from "drizzle-orm";

export class ReprocessingQueries {
  static async createReprocessingHistory(
    data: NewReprocessingHistory
  ): Promise<ReprocessingHistory> {
    const [history] = await db
      .insert(reprocessingHistory)
      .values(data)
      .returning();
    return history;
  }

  static async updateReprocessingHistory(
    id: string,
    updates: {
      status?: ReprocessingHistory["status"];
      completedAt?: Date;
      errorMessage?: string | null;
    }
  ): Promise<ReprocessingHistory | undefined> {
    const [updated] = await db
      .update(reprocessingHistory)
      .set(updates)
      .where(eq(reprocessingHistory.id, id))
      .returning();
    return updated;
  }

  static async getReprocessingHistoryById(
    id: string
  ): Promise<ReprocessingHistory | null> {
    const [history] = await db
      .select()
      .from(reprocessingHistory)
      .where(eq(reprocessingHistory.id, id))
      .limit(1);
    return history ?? null;
  }

  static async getReprocessingHistoryByRecordingId(
    recordingId: string
  ): Promise<ReprocessingHistory[]> {
    return await db
      .select()
      .from(reprocessingHistory)
      .where(eq(reprocessingHistory.recordingId, recordingId))
      .orderBy(desc(reprocessingHistory.startedAt));
  }

  static async getLatestReprocessingHistory(
    recordingId: string
  ): Promise<ReprocessingHistory | null> {
    const [history] = await db
      .select()
      .from(reprocessingHistory)
      .where(eq(reprocessingHistory.recordingId, recordingId))
      .orderBy(desc(reprocessingHistory.startedAt))
      .limit(1);
    return history ?? null;
  }

  static async isRecordingReprocessing(recordingId: string): Promise<boolean> {
    const [history] = await db
      .select()
      .from(reprocessingHistory)
      .where(eq(reprocessingHistory.recordingId, recordingId))
      .orderBy(desc(reprocessingHistory.startedAt))
      .limit(1);
    if (!history) return false;
    return history.status === "running" || history.status === "pending";
  }
}

