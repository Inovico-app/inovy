import { eq } from "drizzle-orm";
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

    return ok(recording || null);
  } catch (error) {
    console.error("Error selecting recording:", error);
    return err(
      error instanceof Error ? error.message : "Unknown database error"
    );
  }
}

