import {
  and,
  count,
  desc,
  eq,
  ilike,
  inArray,
  lte,
  max,
  sql,
} from "drizzle-orm";
import { buildTeamFilter } from "@/lib/rbac/team-isolation";
import type { BetterAuthUser } from "@/lib/auth";
import { db } from "../db";
import { projects } from "../db/schema/projects";
import {
  recordings,
  type NewRecording,
  type Recording,
} from "../db/schema/recordings";

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

  /**
   * Fetch a recording by ID with its project's teamId in a single JOIN query.
   * Used to avoid sequential queries when both recording data and team access are needed.
   */
  static async selectRecordingByIdWithTeam(
    id: string,
  ): Promise<(Recording & { teamId: string | null }) | null> {
    const [result] = await db
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
        storageStatus: recordings.storageStatus,
        recallBotId: recordings.recallBotId,
        duration: recordings.duration,
        recordingDate: recordings.recordingDate,
        transcriptionStatus: recordings.transcriptionStatus,
        transcriptionRetryCount: recordings.transcriptionRetryCount,
        transcriptionNextRetryAt: recordings.transcriptionNextRetryAt,
        transcriptionLastError: recordings.transcriptionLastError,
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
        meetingId: recordings.meetingId,
        teamId: projects.teamId,
      })
      .from(recordings)
      .leftJoin(projects, eq(recordings.projectId, projects.id))
      .where(eq(recordings.id, id))
      .limit(1);
    return result ?? null;
  }

  static async selectRecordingByMeetingId(
    meetingId: string,
  ): Promise<Recording | null> {
    const [recording] = await db
      .select()
      .from(recordings)
      .where(eq(recordings.meetingId, meetingId))
      .orderBy(desc(recordings.createdAt))
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
      limit?: number;
    },
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

    const query = db
      .select()
      .from(recordings)
      .where(and(...conditions))
      .orderBy(desc(recordings.createdAt));

    if (options?.limit) {
      return await query.limit(options.limit);
    }
    return await query;
  }

  static async updateRecordingMetadata(
    id: string,
    data: { title?: string; description?: string | null; recordingDate?: Date },
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
    status: "pending" | "processing" | "completed" | "failed",
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
    status: "pending" | "processing" | "completed" | "failed",
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
    editedById: string,
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
    transcriptionText: string | null,
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
        | "fileUrl"
        | "fileName"
        | "fileSize"
        | "fileMimeType"
        | "storageStatus"
      >
    >,
  ): Promise<Recording | undefined> {
    const [recording] = await db
      .update(recordings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(recordings.id, id))
      .returning();
    return recording;
  }

  static async countRecordingsByProjectId(projectId: string): Promise<number> {
    const [row] = await db
      .select({ value: count() })
      .from(recordings)
      .where(eq(recordings.projectId, projectId));
    return Number(row?.value ?? 0);
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

    // Single query with conditional aggregation for all stats
    const [stats] = await db
      .select({
        totalCount: sql<number>`cast(count(${recordings.id}) as int)`,
        lastRecordingDate: max(recordings.createdAt),
        recentCount: count(
          sql`CASE WHEN ${recordings.createdAt} >= ${sevenDaysAgo} THEN 1 END`,
        ),
      })
      .from(recordings)
      .where(eq(recordings.projectId, projectId));

    return {
      totalCount: stats?.totalCount ?? 0,
      lastRecordingDate: stats?.lastRecordingDate ?? null,
      recentCount: Number(stats?.recentCount ?? 0),
    };
  }

  static async archiveRecording(
    recordingId: string,
    organizationId: string,
  ): Promise<boolean> {
    const result = await db
      .update(recordings)
      .set({ status: "archived", updatedAt: new Date() })
      .where(
        and(
          eq(recordings.id, recordingId),
          eq(recordings.organizationId, organizationId),
        ),
      );
    return result.rowCount !== null && result.rowCount > 0;
  }

  static async unarchiveRecording(
    recordingId: string,
    organizationId: string,
  ): Promise<boolean> {
    const result = await db
      .update(recordings)
      .set({ status: "active", updatedAt: new Date() })
      .where(
        and(
          eq(recordings.id, recordingId),
          eq(recordings.organizationId, organizationId),
        ),
      );
    return result.rowCount !== null && result.rowCount > 0;
  }

  static async deleteRecording(
    recordingId: string,
    organizationId: string,
  ): Promise<boolean> {
    const result = await db
      .delete(recordings)
      .where(
        and(
          eq(recordings.id, recordingId),
          eq(recordings.organizationId, organizationId),
        ),
      );
    return result.rowCount !== null && result.rowCount > 0;
  }

  static async moveRecordingToProject(
    recordingId: string,
    targetProjectId: string,
    organizationId: string,
  ): Promise<Recording | undefined> {
    const [recording] = await db
      .update(recordings)
      .set({ projectId: targetProjectId, updatedAt: new Date() })
      .where(
        and(
          eq(recordings.id, recordingId),
          eq(recordings.organizationId, organizationId),
        ),
      )
      .returning();
    return recording;
  }

  /**
   * Find a recording by external recording ID and organization ID
   */
  static async selectRecordingByExternalId(
    externalRecordingId: string,
    organizationId: string,
  ): Promise<Recording | null> {
    const [recording] = await db
      .select()
      .from(recordings)
      .where(
        and(
          eq(recordings.externalRecordingId, externalRecordingId),
          eq(recordings.organizationId, organizationId),
        ),
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
    data: NewRecording & { externalRecordingId: string },
  ): Promise<Recording> {
    const { id: _id, createdAt: _createdAt, ...updateData } = data;
    const [result] = await db
      .insert(recordings)
      .values(data)
      .onConflictDoUpdate({
        target: [recordings.organizationId, recordings.externalRecordingId],
        set: {
          ...updateData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  // Backoff schedule for deferred retries: 5m, 15m, 1h, 4h, 12h
  private static readonly DEFERRED_RETRY_DELAYS_MS = [
    5 * 60 * 1000,
    15 * 60 * 1000,
    60 * 60 * 1000,
    4 * 60 * 60 * 1000,
    12 * 60 * 60 * 1000,
  ];

  private static readonly MAX_DEFERRED_RETRIES = 5;

  static async queueForTranscriptionRetry(
    id: string,
    error: string,
  ): Promise<Recording | undefined> {
    const recording = await this.selectRecordingById(id);
    if (!recording) return undefined;

    const retryCount = recording.transcriptionRetryCount + 1;

    if (retryCount > this.MAX_DEFERRED_RETRIES) {
      // Mark as permanently failed
      const [failed] = await db
        .update(recordings)
        .set({
          transcriptionStatus: "failed",
          transcriptionLastError: error,
          updatedAt: new Date(),
        })
        .where(eq(recordings.id, id))
        .returning();
      return failed;
    }

    const delayMs =
      this.DEFERRED_RETRY_DELAYS_MS[retryCount - 1] ??
      this.DEFERRED_RETRY_DELAYS_MS[this.DEFERRED_RETRY_DELAYS_MS.length - 1];
    const nextRetryAt = new Date(Date.now() + (delayMs ?? 0));

    const [queued] = await db
      .update(recordings)
      .set({
        transcriptionStatus: "queued_for_retry",
        transcriptionRetryCount: retryCount,
        transcriptionNextRetryAt: nextRetryAt,
        transcriptionLastError: error,
        updatedAt: new Date(),
      })
      .where(eq(recordings.id, id))
      .returning();
    return queued;
  }

  static async getRecordingsQueuedForRetry(limit = 10): Promise<Recording[]> {
    return db
      .select()
      .from(recordings)
      .where(
        and(
          eq(recordings.transcriptionStatus, "queued_for_retry"),
          lte(recordings.transcriptionNextRetryAt, new Date()),
        ),
      )
      .limit(limit);
  }

  static async resetTranscriptionRetry(id: string): Promise<void> {
    await db
      .update(recordings)
      .set({
        transcriptionRetryCount: 0,
        transcriptionNextRetryAt: null,
        transcriptionLastError: null,
        updatedAt: new Date(),
      })
      .where(eq(recordings.id, id));
  }

  /**
   * Select recordings created by a specific user within an organization.
   * Used by GDPR deletion to avoid fetching all org recordings into memory.
   */
  static async selectRecordingsByCreator(
    organizationId: string,
    userId: string,
  ): Promise<Recording[]> {
    return await db
      .select()
      .from(recordings)
      .where(
        and(
          eq(recordings.organizationId, organizationId),
          eq(recordings.createdById, userId),
        ),
      )
      .orderBy(desc(recordings.createdAt));
  }

  /**
   * Select recordings by IDs (batch fetch).
   * Returns only recordings matching the provided IDs.
   */
  static async selectRecordingsByIds(
    recordingIds: string[],
    organizationId: string,
  ): Promise<Recording[]> {
    if (recordingIds.length === 0) return [];
    return await db
      .select()
      .from(recordings)
      .where(
        and(
          inArray(recordings.id, recordingIds),
          eq(recordings.organizationId, organizationId),
        ),
      );
  }

  static async selectRecordingsByOrganization(
    organizationId: string,
    options?: {
      statusFilter?: "active" | "archived";
      search?: string;
      projectIds?: string[];
      departmentId?: string;
      limit?: number;
      user?: BetterAuthUser;
      userTeamIds?: string[];
    },
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

    // Filter by team via project's teamId
    if (options?.user && options?.userTeamIds) {
      const teamFilter = buildTeamFilter(
        projects.teamId,
        options.userTeamIds,
        options.user,
      );
      if (teamFilter) conditions.push(teamFilter);
    }

    const query = db
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
        storageStatus: recordings.storageStatus,
        recallBotId: recordings.recallBotId,
        duration: recordings.duration,
        recordingDate: recordings.recordingDate,
        transcriptionStatus: recordings.transcriptionStatus,
        transcriptionRetryCount: recordings.transcriptionRetryCount,
        transcriptionNextRetryAt: recordings.transcriptionNextRetryAt,
        transcriptionLastError: recordings.transcriptionLastError,
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
        meetingId: recordings.meetingId,
        projectName: projects.name,
      })
      .from(recordings)
      .innerJoin(
        projects,
        and(
          eq(recordings.projectId, projects.id),
          eq(projects.organizationId, organizationId),
        ),
      )
      .where(and(...conditions))
      .orderBy(desc(recordings.recordingDate));

    if (options?.limit) {
      return await query.limit(options.limit);
    }
    return await query;
  }
}
