import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import {
  summaryHistory,
  type NewSummaryHistory,
  type SummaryHistory,
} from "../db/schema";

/**
 * Data access layer for summary history
 */
export class SummaryHistoryQueries {
  /**
   * Create a new summary history entry
   */
  static async insertSummaryHistory(
    data: NewSummaryHistory
  ): Promise<SummaryHistory> {
    const [history] = await db.insert(summaryHistory).values(data).returning();

    return history;
  }

  /**
   * Get summary history for a recording
   * Returns entries sorted by version number (newest first)
   */
  static async selectSummaryHistoryByRecordingId(
    recordingId: string
  ): Promise<SummaryHistory[]> {
    return await db
      .select()
      .from(summaryHistory)
      .where(eq(summaryHistory.recordingId, recordingId))
      .orderBy(desc(summaryHistory.versionNumber));
  }

  /**
   * Get the latest version number for a recording
   */
  static async getLatestVersionNumber(recordingId: string): Promise<number> {
    const result = await db
      .select({ versionNumber: summaryHistory.versionNumber })
      .from(summaryHistory)
      .where(eq(summaryHistory.recordingId, recordingId))
      .orderBy(desc(summaryHistory.versionNumber))
      .limit(1);

    return result[0]?.versionNumber ?? 0;
  }

  /**
   * Delete summary history entries by recording IDs and user ID
   */
  static async deleteByRecordingIdsAndUserId(
    recordingIds: string[],
    userId: string
  ): Promise<void> {
    if (recordingIds.length === 0) return;

    await db
      .delete(summaryHistory)
      .where(
        and(
          inArray(summaryHistory.recordingId, recordingIds),
          eq(summaryHistory.editedById, userId)
        )
      );
  }
}

