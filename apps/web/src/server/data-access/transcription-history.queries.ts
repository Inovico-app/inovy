import { and, desc, eq } from "drizzle-orm";
import { err, ok, type Result } from "neverthrow";
import { db } from "../db";
import {
  transcriptionHistory,
  type NewTranscriptionHistory,
  type TranscriptionHistory,
} from "../db/schema";

/**
 * Data access layer for transcription history
 */
export class TranscriptionHistoryQueries {
  /**
   * Create a new transcription history entry
   */
  static async insertTranscriptionHistory(
    data: NewTranscriptionHistory
  ): Promise<Result<TranscriptionHistory, Error>> {
    try {
      const [history] = await db
        .insert(transcriptionHistory)
        .values(data)
        .returning();

      return ok(history);
    } catch (error) {
      return err(error as Error);
    }
  }

  /**
   * Get transcription history for a recording
   * Returns entries sorted by version number (newest first)
   */
  static async selectTranscriptionHistoryByRecordingId(
    recordingId: string
  ): Promise<Result<TranscriptionHistory[], Error>> {
    try {
      const history = await db
        .select()
        .from(transcriptionHistory)
        .where(eq(transcriptionHistory.recordingId, recordingId))
        .orderBy(desc(transcriptionHistory.versionNumber));

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
      const history = await db
        .select()
        .from(transcriptionHistory)
        .where(eq(transcriptionHistory.recordingId, recordingId))
        .orderBy(desc(transcriptionHistory.versionNumber))
        .limit(1);

      const latestVersion = history[0]?.versionNumber ?? 0;
      return ok(latestVersion);
    } catch (error) {
      return err(error as Error);
    }
  }

  /**
   * Get a specific version of transcription
   */
  static async selectTranscriptionVersion(
    recordingId: string,
    versionNumber: number
  ): Promise<Result<TranscriptionHistory | null, Error>> {
    try {
      const [history] = await db
        .select()
        .from(transcriptionHistory)
        .where(
          and(
            eq(transcriptionHistory.recordingId, recordingId),
            eq(transcriptionHistory.versionNumber, versionNumber)
          )
        )
        .limit(1);

      return ok(history ?? null);
    } catch (error) {
      return err(error as Error);
    }
  }
}

