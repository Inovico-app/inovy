import { desc, eq } from "drizzle-orm";
import { err, ok, type Result } from "neverthrow";
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
  ): Promise<Result<SummaryHistory, Error>> {
    try {
      const [history] = await db
        .insert(summaryHistory)
        .values(data)
        .returning();

      return ok(history);
    } catch (error) {
      return err(error as Error);
    }
  }

  /**
   * Get summary history for a recording
   * Returns entries sorted by version number (newest first)
   */
  static async selectSummaryHistoryByRecordingId(
    recordingId: string
  ): Promise<Result<SummaryHistory[], Error>> {
    try {
      const history = await db
        .select()
        .from(summaryHistory)
        .where(eq(summaryHistory.recordingId, recordingId))
        .orderBy(desc(summaryHistory.versionNumber));

      return ok(history);
    } catch (error) {
      return err(error as Error);
    }
  }

  /**
   * Get the latest version number for a recording
   */
  static async getLatestVersionNumber(
    recordingId: string
  ): Promise<Result<number, Error>> {
    try {
      const result = await db
        .select({ versionNumber: summaryHistory.versionNumber })
        .from(summaryHistory)
        .where(eq(summaryHistory.recordingId, recordingId))
        .orderBy(desc(summaryHistory.versionNumber))
        .limit(1);

      return ok(result[0]?.versionNumber ?? 0);
    } catch (error) {
      return err(error as Error);
    }
  }
}

