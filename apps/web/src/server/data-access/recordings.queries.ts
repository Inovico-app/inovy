import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  max,
  sql,
} from "drizzle-orm";
import { db } from "../db";
import { projects } from "../db/schema/projects";
import {
  recordings,
  type NewRecording,
  type Recording,
} from "../db/schema/recordings";
import { TeamQueries } from "./teams.queries";

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
    organizationId: string,
    options?: {
      search?: string;
      includeArchived?: boolean;
      statusFilter?: "active" | "archived";
    }
  ): Promise<Recording[]> {
    const conditions = [
      eq(recordings.projectId, projectId),
      eq(recordings.organizationId, organizationId),
    ];
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

  /**
   * Update transcription text and clear edited info (for anonymization)
   */
  static async anonymizeTranscriptionText(
    id: string,
    transcriptionText: string | null
  ): Promise<Recording | undefined> {
    const [recording] = await db
      .update(recordings)
      .set({
        transcriptionText,
        transcriptionLastEditedById: null,
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
        | "redactedTranscriptionText"
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
    // Calculate seven days ago for recent count filter
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get total count and last recording date in a single optimized query
    const statsResult = await db
      .select({
        totalCount: sql<number>`cast(count(${recordings.id}) as int)`,
        lastRecordingDate: max(recordings.createdAt),
      })
      .from(recordings)
      .where(eq(recordings.projectId, projectId));

    const totalCount = statsResult[0]?.totalCount ?? 0;
    const lastRecordingDate = statsResult[0]?.lastRecordingDate ?? null;

    // Get recent count (recordings from last 7 days) using an optimized query
    const recentStatsResult = await db
      .select({
        recentCount: sql<number>`cast(count(${recordings.id}) as int)`,
      })
      .from(recordings)
      .where(
        and(
          eq(recordings.projectId, projectId),
          gte(recordings.createdAt, sevenDaysAgo)
        )
      );

    const recentCount = recentStatsResult[0]?.recentCount ?? 0;

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
    return await db.transaction(async (tx) => {
      const [recording] = await tx
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
    });
  }

  /**
   * Find a recording by external recording ID and organization ID
   */
  static async selectRecordingByExternalId(
    externalRecordingId: string,
    organizationId: string
  ): Promise<Recording | null> {
    const [recording] = await db
      .select()
      .from(recordings)
      .where(
        and(
          eq(recordings.externalRecordingId, externalRecordingId),
          eq(recordings.organizationId, organizationId)
        )
      )
      .limit(1);
    return recording ?? null;
  }

  /**
   * Create or update a recording by external recording ID (upsert)
   * If a recording with the same externalRecordingId and organizationId exists,
   * it will be updated; otherwise, a new recording will be created.
   */
  static async upsertRecordingByExternalId(
    data: NewRecording & { externalRecordingId: string }
  ): Promise<Recording> {
    return await db.transaction(async (tx) => {
      // Check if recording exists
      const existing = await tx
        .select()
        .from(recordings)
        .where(
          and(
            eq(recordings.externalRecordingId, data.externalRecordingId),
            eq(recordings.organizationId, data.organizationId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // Update existing recording
        const [updated] = await tx
          .update(recordings)
          .set({
            ...data,
            updatedAt: new Date(),
          })
          .where(eq(recordings.id, existing[0].id))
          .returning();
        return updated;
      } else {
        // Insert new recording
        const [created] = await tx.insert(recordings).values(data).returning();
        return created;
      }
    });
  }

  static async selectRecordingsByOrganization(
    organizationId: string,
    options?: {
      statusFilter?: "active" | "archived";
      search?: string;
      projectIds?: string[];
      teamIds?: string[];
      departmentId?: string;
    }
  ): Promise<Array<Recording & { projectName: string }>> {
    const conditions = [eq(recordings.organizationId, organizationId)];

    if (options?.statusFilter) {
      conditions.push(eq(recordings.status, options.statusFilter));
    }

    if (options?.search) {
      conditions.push(ilike(recordings.title, `%${options.search}%`));
    }

    if (options?.projectIds && options.projectIds.length > 0) {
      conditions.push(inArray(recordings.projectId, options.projectIds));
    }

    // Filter by team: get user IDs in the specified teams
    if (options?.teamIds && options.teamIds.length > 0) {
      const teamMembers = await TeamQueries.selectTeamMembers(
        options.teamIds[0]
      );
      if (teamMembers.length) {
        const userIds = Array.from(new Set(teamMembers.map((u) => u.userId)));
        if (userIds.length > 0) {
          conditions.push(inArray(recordings.createdById, userIds));
        }
      }
    }

    const result = await db
      .select({
        id: recordings.id,
        projectId: recordings.projectId,
        externalRecordingId: recordings.externalRecordingId,
        title: recordings.title,
        description: recordings.description,
        fileUrl: recordings.fileUrl,
        fileName: recordings.fileName,
        fileSize: recordings.fileSize,
        fileMimeType: recordings.fileMimeType,
        duration: recordings.duration,
        recordingDate: recordings.recordingDate,
        transcriptionStatus: recordings.transcriptionStatus,
        transcriptionText: recordings.transcriptionText,
        redactedTranscriptionText: recordings.redactedTranscriptionText,
        isTranscriptionManuallyEdited: recordings.isTranscriptionManuallyEdited,
        transcriptionLastEditedById: recordings.transcriptionLastEditedById,
        transcriptionLastEditedAt: recordings.transcriptionLastEditedAt,
        recordingMode: recordings.recordingMode,
        language: recordings.language,
        status: recordings.status,
        workflowStatus: recordings.workflowStatus,
        workflowError: recordings.workflowError,
        workflowRetryCount: recordings.workflowRetryCount,
        lastReprocessedAt: recordings.lastReprocessedAt,
        reprocessingTriggeredById: recordings.reprocessingTriggeredById,
        organizationId: recordings.organizationId,
        createdById: recordings.createdById,
        createdAt: recordings.createdAt,
        updatedAt: recordings.updatedAt,
        consentGiven: recordings.consentGiven,
        consentGivenBy: recordings.consentGivenBy,
        consentGivenAt: recordings.consentGivenAt,
        consentRevokedAt: recordings.consentRevokedAt,
        isEncrypted: recordings.isEncrypted,
        encryptionMetadata: recordings.encryptionMetadata,
        projectName: projects.name,
      })
      .from(recordings)
      .innerJoin(
        projects,
        and(
          eq(recordings.projectId, projects.id),
          eq(projects.organizationId, organizationId)
        )
      )
      .where(and(...conditions))
      .orderBy(desc(recordings.recordingDate));

    return result;
  }
}

