import { and, desc, eq } from "drizzle-orm";
import { db } from "../db";
import {
  transcriptionHistory,
  type NewTranscriptionHistory,
  type TranscriptionHistory,
} from "../db/schema";

export class TranscriptionHistoryQueries {
  static async insertTranscriptionHistory(
    data: NewTranscriptionHistory
  ): Promise<TranscriptionHistory> {
    const [history] = await db
      .insert(transcriptionHistory)
      .values(data)
      .returning();
    return history;
  }

  static async selectTranscriptionHistoryByRecordingId(
    recordingId: string
  ): Promise<TranscriptionHistory[]> {
    return await db
      .select()
      .from(transcriptionHistory)
      .where(eq(transcriptionHistory.recordingId, recordingId))
      .orderBy(desc(transcriptionHistory.versionNumber));
  }

  static async getLatestVersionNumber(recordingId: string): Promise<number> {
    const history = await db
      .select()
      .from(transcriptionHistory)
      .where(eq(transcriptionHistory.recordingId, recordingId))
      .orderBy(desc(transcriptionHistory.versionNumber))
      .limit(1);
    return history[0]?.versionNumber ?? 0;
  }

  static async selectTranscriptionVersion(
    recordingId: string,
    versionNumber: number
  ): Promise<TranscriptionHistory | null> {
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
    return history ?? null;
  }
}

