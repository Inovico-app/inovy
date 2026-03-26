import { asc, count, eq } from "drizzle-orm";
import { db } from "../db";
import {
  transcriptChunks,
  type NewTranscriptChunk,
  type TranscriptChunk,
} from "../db/schema/transcript-chunks";

export class TranscriptChunksQueries {
  static async insertChunk(
    chunk: NewTranscriptChunk,
  ): Promise<TranscriptChunk> {
    const [inserted] = await db
      .insert(transcriptChunks)
      .values(chunk)
      .returning();
    return inserted;
  }

  static async insertChunks(
    chunks: NewTranscriptChunk[],
  ): Promise<TranscriptChunk[]> {
    if (chunks.length === 0) return [];
    return await db.insert(transcriptChunks).values(chunks).returning();
  }

  static async findBySessionId(sessionId: string): Promise<TranscriptChunk[]> {
    return await db
      .select()
      .from(transcriptChunks)
      .where(eq(transcriptChunks.botSessionId, sessionId))
      .orderBy(asc(transcriptChunks.startTime));
  }

  static async findByRecordingId(
    recordingId: string,
  ): Promise<TranscriptChunk[]> {
    return await db
      .select()
      .from(transcriptChunks)
      .where(eq(transcriptChunks.recordingId, recordingId))
      .orderBy(asc(transcriptChunks.startTime));
  }

  static async countBySessionId(sessionId: string): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(transcriptChunks)
      .where(eq(transcriptChunks.botSessionId, sessionId));
    return result?.count ?? 0;
  }

  /**
   * Link chunks from a bot session to a recording.
   * Called when recording.done fires and the recording ID is known.
   */
  static async linkToRecording(
    sessionId: string,
    recordingId: string,
  ): Promise<void> {
    await db
      .update(transcriptChunks)
      .set({ recordingId })
      .where(eq(transcriptChunks.botSessionId, sessionId));
  }

  /**
   * Assemble chunks into a plain text transcript for interim display.
   * Groups consecutive chunks by speaker and formats as "Speaker X: text"
   */
  static async assembleInterimTranscript(
    recordingId: string,
  ): Promise<string | null> {
    const chunks = await this.findByRecordingId(recordingId);
    if (chunks.length === 0) return null;

    const lines: string[] = [];
    let currentSpeaker: string | null = null;
    let currentText = "";

    for (const chunk of chunks) {
      const speaker = chunk.speakerId ?? "Unknown";

      if (speaker !== currentSpeaker) {
        if (currentText) {
          lines.push(`${currentSpeaker ?? "Unknown"}: ${currentText.trim()}`);
        }
        currentSpeaker = speaker;
        currentText = chunk.text;
      } else {
        currentText += " " + chunk.text;
      }
    }

    if (currentText) {
      lines.push(`${currentSpeaker ?? "Unknown"}: ${currentText.trim()}`);
    }

    return lines.join("\n\n");
  }
}
