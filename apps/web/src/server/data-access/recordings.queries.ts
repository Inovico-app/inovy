import { and, desc, eq, ilike } from "drizzle-orm";
import { type Result, err, ok } from "neverthrow";
import { db } from "../db";
import { recordings, type NewRecording, type Recording } from "../db/schema";

/**
 * Insert a new recording into the database
 */
export async function insertRecording(
  data: NewRecording
): Promise<Result<Recording, string>> {
  try {
    const [recording] = await db.insert(recordings).values(data).returning();

    if (!recording) {
      return err("Failed to create recording");
    }

    return ok(recording);
  } catch (error) {
    console.error("Error inserting recording:", error);
    return err(
      error instanceof Error ? error.message : "Unknown database error"
    );
  }
}

/**
 * Get a recording by ID
 */
export async function selectRecordingById(
  id: string
): Promise<Result<Recording | null, string>> {
  try {
    const [recording] = await db
      .select()
      .from(recordings)
      .where(eq(recordings.id, id))
      .limit(1);

    return ok(recording ?? null);
  } catch (error) {
    console.error("Error selecting recording:", error);
    return err(
      error instanceof Error ? error.message : "Unknown database error"
    );
  }
}

/**
 * Get recordings by project ID
 * Returns recordings ordered by creation date (newest first)
 */
export async function selectRecordingsByProjectId(
  projectId: string,
  options?: {
    search?: string;
  }
): Promise<Result<Recording[], string>> {
  try {
    const conditions = [eq(recordings.projectId, projectId)];

    // Add search condition if provided
    if (options?.search) {
      conditions.push(ilike(recordings.title, `%${options.search}%`));
    }

    const results = await db
      .select()
      .from(recordings)
      .where(and(...conditions))
      .orderBy(desc(recordings.createdAt));

    return ok(results);
  } catch (error) {
    console.error("Error selecting recordings by project:", error);
    return err(
      error instanceof Error ? error.message : "Unknown database error"
    );
  }
}

/**
 * Update recording metadata
 */
export async function updateRecordingMetadata(
  id: string,
  data: {
    title?: string;
    description?: string | null;
    recordingDate?: Date;
  }
): Promise<Result<Recording, string>> {
  try {
    const [recording] = await db
      .update(recordings)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(recordings.id, id))
      .returning();

    if (!recording) {
      return err("Recording not found");
    }

    return ok(recording);
  } catch (error) {
    console.error("Error updating recording:", error);
    return err(
      error instanceof Error ? error.message : "Unknown database error"
    );
  }
}

/**
 * Update recording transcription status
 */
export async function updateRecordingTranscriptionStatus(
  id: string,
  status: "pending" | "processing" | "completed" | "failed"
): Promise<Result<Recording, string>> {
  try {
    const [recording] = await db
      .update(recordings)
      .set({
        transcriptionStatus: status,
        updatedAt: new Date(),
      })
      .where(eq(recordings.id, id))
      .returning();

    if (!recording) {
      return err("Recording not found");
    }

    return ok(recording);
  } catch (error) {
    console.error("Error updating transcription status:", error);
    return err(
      error instanceof Error ? error.message : "Unknown database error"
    );
  }
}

/**
 * Update recording transcription text and status
 */
export async function updateRecordingTranscription(
  id: string,
  transcriptionText: string,
  status: "pending" | "processing" | "completed" | "failed"
): Promise<Result<Recording, string>> {
  try {
    const [recording] = await db
      .update(recordings)
      .set({
        transcriptionText,
        transcriptionStatus: status,
        updatedAt: new Date(),
      })
      .where(eq(recordings.id, id))
      .returning();

    if (!recording) {
      return err("Recording not found");
    }

    return ok(recording);
  } catch (error) {
    console.error("Error updating transcription:", error);
    return err(
      error instanceof Error ? error.message : "Unknown database error"
    );
  }
}

/**
 * Count recordings by project ID
 */
export async function countRecordingsByProjectId(
  projectId: string
): Promise<Result<number, string>> {
  try {
    const results = await db
      .select()
      .from(recordings)
      .where(eq(recordings.projectId, projectId));

    return ok(results.length);
  } catch (error) {
    console.error("Error counting recordings:", error);
    return err(
      error instanceof Error ? error.message : "Unknown database error"
    );
  }
}

// Export as RecordingsQueries class for consistency
export const RecordingsQueries = {
  insertRecording,
  selectRecordingById,
  selectRecordingsByProjectId,
  updateRecordingMetadata,
  updateRecordingTranscriptionStatus,
  updateRecordingTranscription,
  countRecordingsByProjectId,
};

