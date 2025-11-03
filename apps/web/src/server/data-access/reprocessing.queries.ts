import { db } from "@/server/db";
import {
  reprocessingHistory,
  type NewReprocessingHistory,
  type ReprocessingHistory,
} from "@/server/db/schema/reprocessing-history";
import { eq, desc } from "drizzle-orm";
import { err, ok, type Result } from "neverthrow";

export class ReprocessingQueries {
  /**
   * Create a new reprocessing history record
   */
  static async createReprocessingHistory(
    data: NewReprocessingHistory
  ): Promise<Result<ReprocessingHistory, Error>> {
    try {
      const [history] = await db
        .insert(reprocessingHistory)
        .values(data)
        .returning();

      if (!history) {
        return err(new Error("Failed to create reprocessing history"));
      }

      return ok(history);
    } catch (error) {
      return err(
        error instanceof Error
          ? error
          : new Error("Failed to create reprocessing history")
      );
    }
  }

  /**
   * Update reprocessing history status
   */
  static async updateReprocessingHistory(
    id: string,
    updates: {
      status?: ReprocessingHistory["status"];
      completedAt?: Date;
      errorMessage?: string | null;
    }
  ): Promise<Result<ReprocessingHistory, Error>> {
    try {
      const [updated] = await db
        .update(reprocessingHistory)
        .set(updates)
        .where(eq(reprocessingHistory.id, id))
        .returning();

      if (!updated) {
        return err(new Error("Reprocessing history not found"));
      }

      return ok(updated);
    } catch (error) {
      return err(
        error instanceof Error
          ? error
          : new Error("Failed to update reprocessing history")
      );
    }
  }

  /**
   * Get reprocessing history by ID
   */
  static async getReprocessingHistoryById(
    id: string
  ): Promise<Result<ReprocessingHistory | null, Error>> {
    try {
      const [history] = await db
        .select()
        .from(reprocessingHistory)
        .where(eq(reprocessingHistory.id, id))
        .limit(1);

      return ok(history ?? null);
    } catch (error) {
      return err(
        error instanceof Error
          ? error
          : new Error("Failed to get reprocessing history")
      );
    }
  }

  /**
   * Get all reprocessing history for a recording
   */
  static async getReprocessingHistoryByRecordingId(
    recordingId: string
  ): Promise<Result<ReprocessingHistory[], Error>> {
    try {
      const histories = await db
        .select()
        .from(reprocessingHistory)
        .where(eq(reprocessingHistory.recordingId, recordingId))
        .orderBy(desc(reprocessingHistory.startedAt));

      return ok(histories);
    } catch (error) {
      return err(
        error instanceof Error
          ? error
          : new Error("Failed to get reprocessing history")
      );
    }
  }

  /**
   * Get the most recent reprocessing history for a recording
   */
  static async getLatestReprocessingHistory(
    recordingId: string
  ): Promise<Result<ReprocessingHistory | null, Error>> {
    try {
      const [history] = await db
        .select()
        .from(reprocessingHistory)
        .where(eq(reprocessingHistory.recordingId, recordingId))
        .orderBy(desc(reprocessingHistory.startedAt))
        .limit(1);

      return ok(history ?? null);
    } catch (error) {
      return err(
        error instanceof Error
          ? error
          : new Error("Failed to get latest reprocessing history")
      );
    }
  }

  /**
   * Check if a recording is currently being reprocessed
   */
  static async isRecordingReprocessing(
    recordingId: string
  ): Promise<Result<boolean, Error>> {
    try {
      const [history] = await db
        .select()
        .from(reprocessingHistory)
        .where(eq(reprocessingHistory.recordingId, recordingId))
        .orderBy(desc(reprocessingHistory.startedAt))
        .limit(1);

      if (!history) {
        return ok(false);
      }

      // Check if status is running or pending
      return ok(history.status === "running" || history.status === "pending");
    } catch (error) {
      return err(
        error instanceof Error
          ? error
          : new Error("Failed to check reprocessing status")
      );
    }
  }
}

