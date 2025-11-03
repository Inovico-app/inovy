import { and, desc, eq, ilike } from "drizzle-orm";
import { err, ok, type Result } from "neverthrow";
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
 * By default, only returns active recordings unless includeArchived is true
 */
export async function selectRecordingsByProjectId(
  projectId: string,
  options?: {
    search?: string;
    includeArchived?: boolean;
    statusFilter?: "active" | "archived";
  }
): Promise<Result<Recording[], string>> {
  try {
    const conditions = [eq(recordings.projectId, projectId)];

    // Add status filter - by default only show active recordings
    if (options?.statusFilter) {
      conditions.push(eq(recordings.status, options.statusFilter));
    } else if (!options?.includeArchived) {
      conditions.push(eq(recordings.status, "active"));
    }

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
 * Update recording transcription with manual edit tracking
 */
export async function updateRecordingTranscriptionWithEdit(
  id: string,
  transcriptionText: string,
  editedById: string
): Promise<Result<Recording, string>> {
  try {
    const [recording] = await db
      .update(recordings)
      .set({
        transcriptionText,
        isTranscriptionManuallyEdited: true,
        transcriptionLastEditedById: editedById,
        transcriptionLastEditedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(recordings.id, id))
      .returning();

    if (!recording) {
      return err("Recording not found");
    }

    return ok(recording);
  } catch (error) {
    console.error("Error updating transcription with edit:", error);
    return err(
      error instanceof Error ? error.message : "Unknown database error"
    );
  }
}

/**
 * Update recording with partial data (generic update)
 */
export async function updateRecording(
  id: string,
  data: Partial<
    Pick<
      Recording,
      | "workflowStatus"
      | "workflowError"
      | "workflowRetryCount"
      | "lastReprocessedAt"
      | "reprocessingTriggeredById"
      | "title"
      | "description"
      | "recordingDate"
      | "transcriptionStatus"
      | "transcriptionText"
    >
  >
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

/**
 * Get recording statistics for a project
 */
export async function getRecordingStatistics(projectId: string): Promise<
  Result<
    {
      totalCount: number;
      lastRecordingDate: Date | null;
      recentCount: number; // last 7 days
    },
    string
  >
> {
  try {
    const allRecordings = await db
      .select()
      .from(recordings)
      .where(eq(recordings.projectId, projectId))
      .orderBy(desc(recordings.createdAt));

    const totalCount = allRecordings.length;
    const lastRecordingDate =
      allRecordings.length > 0 ? allRecordings[0].createdAt : null;

    // Count recordings from last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentCount = allRecordings.filter(
      (r) => r.createdAt >= sevenDaysAgo
    ).length;

    return ok({
      totalCount,
      lastRecordingDate,
      recentCount,
    });
  } catch (error) {
    console.error("Error getting recording statistics:", error);
    return err(
      error instanceof Error ? error.message : "Unknown database error"
    );
  }
}

/**
 * Archive a recording (soft delete)
 */
export async function archiveRecording(
  recordingId: string,
  organizationId: string
): Promise<boolean> {
  return await db.transaction(async (tx) => {
    const result = await tx
      .update(recordings)
      .set({
        status: "archived",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(recordings.id, recordingId),
          eq(recordings.organizationId, organizationId)
        )
      );

    return result.rowCount !== null && result.rowCount > 0;
  });
}

/**
 * Unarchive a recording
 */
export async function unarchiveRecording(
  recordingId: string,
  organizationId: string
): Promise<boolean> {
  return await db.transaction(async (tx) => {
    const result = await tx
      .update(recordings)
      .set({
        status: "active",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(recordings.id, recordingId),
          eq(recordings.organizationId, organizationId)
        )
      );

    return result.rowCount !== null && result.rowCount > 0;
  });
}

/**
 * Delete a recording (hard delete)
 */
export async function deleteRecording(
  recordingId: string,
  organizationId: string
): Promise<boolean> {
  return await db.transaction(async (tx) => {
    const result = await tx
      .delete(recordings)
      .where(
        and(
          eq(recordings.id, recordingId),
          eq(recordings.organizationId, organizationId)
        )
      );

    return result.rowCount !== null && result.rowCount > 0;
  });
}

// Export as RecordingsQueries class for consistency
export const RecordingsQueries = {
  insertRecording,
  selectRecordingById,
  selectRecordingsByProjectId,
  updateRecordingMetadata,
  updateRecordingTranscriptionStatus,
  updateRecordingTranscription,
  updateRecordingTranscriptionWithEdit,
  updateRecording,
  countRecordingsByProjectId,
  getRecordingStatistics,
  archiveRecording,
  unarchiveRecording,
  deleteRecording,
};

