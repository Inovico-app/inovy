import { and, count, desc, eq, ilike } from "drizzle-orm";
import { db } from "../db";
import { recordings, type NewRecording, type Recording } from "../db/schema";

export class RecordingsQueries {
  static async insertRecording(data: NewRecording): Promise<Recording> {
    const [recording] = await db.insert(recordings).values(data).returning();
    return recording;
  }

  static async selectRecordingById(id: string): Promise<Recording | null> {
    const [recording] = await db
      .select()
      .from(recordings)
      .where(eq(recordings.id, id))
      .limit(1);
    return recording ?? null;
  }

  static async selectRecordingsByProjectId(
    projectId: string,
    options?: {
      search?: string;
      includeArchived?: boolean;
      statusFilter?: "active" | "archived";
    }
  ): Promise<Recording[]> {
    const conditions = [eq(recordings.projectId, projectId)];
    if (options?.statusFilter)
      conditions.push(eq(recordings.status, options.statusFilter));
    else if (!options?.includeArchived)
      conditions.push(eq(recordings.status, "active"));
    if (options?.search)
      conditions.push(ilike(recordings.title, `%${options.search}%`));
    return await db
      .select()
      .from(recordings)
      .where(and(...conditions))
      .orderBy(desc(recordings.createdAt));
  }

  static async updateRecordingMetadata(
    id: string,
    data: { title?: string; description?: string | null; recordingDate?: Date }
  ): Promise<Recording | undefined> {
    const [recording] = await db
      .update(recordings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(recordings.id, id))
      .returning();
    return recording;
  }

  static async updateRecordingTranscriptionStatus(
    id: string,
    status: "pending" | "processing" | "completed" | "failed"
  ): Promise<Recording | undefined> {
    const [recording] = await db
      .update(recordings)
      .set({ transcriptionStatus: status, updatedAt: new Date() })
      .where(eq(recordings.id, id))
      .returning();
    return recording;
  }

  static async updateRecordingTranscription(
    id: string,
    transcriptionText: string,
    status: "pending" | "processing" | "completed" | "failed"
  ): Promise<Recording | undefined> {
    const [recording] = await db
      .update(recordings)
      .set({
        transcriptionText,
        transcriptionStatus: status,
        updatedAt: new Date(),
      })
      .where(eq(recordings.id, id))
      .returning();
    return recording;
  }

  static async updateRecordingTranscriptionWithEdit(
    id: string,
    transcriptionText: string,
    editedById: string
  ): Promise<Recording | undefined> {
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
    return recording;
  }

  static async updateRecording(
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
  ): Promise<Recording | undefined> {
    const [recording] = await db
      .update(recordings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(recordings.id, id))
      .returning();
    return recording;
  }

  static async countRecordingsByProjectId(projectId: string): Promise<number> {
    const results = await db
      .select()
      .from(recordings)
      .where(eq(recordings.projectId, projectId));
    return results.length;
  }

  static async countByOrganization(organizationId: string): Promise<number> {
    const [row] = await db
      .select({ value: count() })
      .from(recordings)
      .where(eq(recordings.organizationId, organizationId));
    return Number(row?.value ?? 0);
  }

  static async getRecordingStatistics(projectId: string): Promise<{
    totalCount: number;
    lastRecordingDate: Date | null;
    recentCount: number;
  }> {
    const allRecordings = await db
      .select()
      .from(recordings)
      .where(eq(recordings.projectId, projectId))
      .orderBy(desc(recordings.createdAt));
    const totalCount = allRecordings.length;
    const lastRecordingDate =
      allRecordings.length > 0 ? allRecordings[0].createdAt : null;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentCount = allRecordings.filter(
      (r) => r.createdAt >= sevenDaysAgo
    ).length;
    return {
      totalCount,
      lastRecordingDate,
      recentCount,
    };
  }

  static async archiveRecording(
    recordingId: string,
    organizationId: string
  ): Promise<boolean> {
    return await db.transaction(async (tx) => {
      const result = await tx
        .update(recordings)
        .set({ status: "archived", updatedAt: new Date() })
        .where(
          and(
            eq(recordings.id, recordingId),
            eq(recordings.organizationId, organizationId)
          )
        );
      return result.rowCount !== null && result.rowCount > 0;
    });
  }

  static async unarchiveRecording(
    recordingId: string,
    organizationId: string
  ): Promise<boolean> {
    return await db.transaction(async (tx) => {
      const result = await tx
        .update(recordings)
        .set({ status: "active", updatedAt: new Date() })
        .where(
          and(
            eq(recordings.id, recordingId),
            eq(recordings.organizationId, organizationId)
          )
        );
      return result.rowCount !== null && result.rowCount > 0;
    });
  }

  static async deleteRecording(
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

  static async moveRecordingToProject(
    recordingId: string,
    targetProjectId: string,
    organizationId: string
  ): Promise<Recording | undefined> {
    const [recording] = await db
      .update(recordings)
      .set({ projectId: targetProjectId, updatedAt: new Date() })
      .where(
        and(
          eq(recordings.id, recordingId),
          eq(recordings.organizationId, organizationId)
        )
      )
      .returning();
    return recording;
  }
}

