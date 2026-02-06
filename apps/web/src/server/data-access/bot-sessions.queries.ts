import { and, count, desc, eq, gte, inArray, lt } from "drizzle-orm";
import { db } from "../db";
import {
  botSessions,
  type BotSession,
  type BotStatus,
  type NewBotSession,
} from "../db/schema/bot-sessions";
import { recordings } from "../db/schema/recordings";

/**
 * Database queries for Bot Session operations
 * Pure data access layer - no business logic
 */
export class BotSessionsQueries {
  /**
   * Create a new bot session
   */
  static async insert(data: NewBotSession): Promise<BotSession> {
    const [session] = await db.insert(botSessions).values(data).returning();
    return session;
  }

  /**
   * Find a bot session by ID
   */
  static async findById(
    id: string,
    organizationId: string
  ): Promise<BotSession | null> {
    const result = await db
      .select()
      .from(botSessions)
      .where(
        and(
          eq(botSessions.id, id),
          eq(botSessions.organizationId, organizationId)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * Find a bot session by Recall.ai bot ID
   */
  static async findByRecallBotId(
    recallBotId: string,
    organizationId: string
  ): Promise<BotSession | null> {
    const result = await db
      .select()
      .from(botSessions)
      .where(
        and(
          eq(botSessions.recallBotId, recallBotId),
          eq(botSessions.organizationId, organizationId)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * Find bot sessions by project
   */
  static async findByProjectId(
    projectId: string,
    organizationId: string
  ): Promise<BotSession[]> {
    return await db
      .select()
      .from(botSessions)
      .where(
        and(
          eq(botSessions.projectId, projectId),
          eq(botSessions.organizationId, organizationId)
        )
      )
      .orderBy(desc(botSessions.createdAt));
  }

  /**
   * Update bot session
   */
  static async update(
    id: string,
    organizationId: string,
    data: Partial<
      Pick<
        BotSession,
        | "recordingId"
        | "recallStatus"
        | "recallBotId"
        | "botStatus"
        | "calendarEventId"
        | "error"
        | "meetingTitle"
        | "meetingParticipants"
        | "joinedAt"
        | "leftAt"
      >
    >
  ): Promise<BotSession | null> {
    const [session] = await db
      .update(botSessions)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(botSessions.id, id),
          eq(botSessions.organizationId, organizationId)
        )
      )
      .returning();

    return session ?? null;
  }

  /**
   * Update bot session by Recall.ai bot ID
   */
  static async updateByRecallBotId(
    recallBotId: string,
    organizationId: string,
    data: Partial<
      Pick<
        BotSession,
        | "recordingId"
        | "recallStatus"
        | "botStatus"
        | "joinedAt"
        | "leftAt"
        | "error"
      >
    >
  ): Promise<BotSession | null> {
    const [session] = await db
      .update(botSessions)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(botSessions.recallBotId, recallBotId),
          eq(botSessions.organizationId, organizationId)
        )
      )
      .returning();

    return session ?? null;
  }

  /**
   * Find bot session by calendar event ID
   * Used for deduplication in calendar monitoring
   */
  static async findByCalendarEventId(
    calendarEventId: string,
    organizationId: string
  ): Promise<BotSession | null> {
    const result = await db
      .select()
      .from(botSessions)
      .where(
        and(
          eq(botSessions.calendarEventId, calendarEventId),
          eq(botSessions.organizationId, organizationId)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * Find bot sessions by multiple calendar event IDs
   * Returns a map of calendarEventId -> BotSession for quick lookup
   */
  static async findByCalendarEventIds(
    calendarEventIds: string[],
    organizationId: string
  ): Promise<Map<string, BotSession>> {
    if (calendarEventIds.length === 0) {
      return new Map();
    }

    const result = await db
      .select()
      .from(botSessions)
      .where(
        and(
          inArray(botSessions.calendarEventId, calendarEventIds),
          eq(botSessions.organizationId, organizationId)
        )
      );

    const sessionMap = new Map<string, BotSession>();
    for (const session of result) {
      if (session.calendarEventId) {
        sessionMap.set(session.calendarEventId, session);
      }
    }

    return sessionMap;
  }

  /**
   * Find bot sessions by status
   */
  static async findByStatus(
    status: BotStatus,
    organizationId: string,
    limit?: number
  ): Promise<BotSession[]> {
    const query = db
      .select()
      .from(botSessions)
      .where(
        and(
          eq(botSessions.botStatus, status),
          eq(botSessions.organizationId, organizationId)
        )
      )
      .orderBy(desc(botSessions.createdAt));

    if (limit) {
      return await query.limit(limit);
    }

    return await query;
  }

  /**
   * Find bot sessions that need status polling
   * Returns sessions in 'joining' or 'active' status created within time window
   */
  static async findSessionsNeedingPolling(
    organizationId: string,
    options?: {
      maxAgeHours?: number; // Default: 4 hours
      statuses?: BotStatus[]; // Default: ['joining', 'active']
      limit?: number; // Default: 100
    }
  ): Promise<BotSession[]> {
    const maxAgeHours = options?.maxAgeHours ?? 4;
    const statuses = options?.statuses ?? ["joining", "active"];
    const limit = options?.limit ?? 100;

    // Calculate the minimum created date (now - maxAgeHours)
    const minCreatedAt = new Date();
    minCreatedAt.setHours(minCreatedAt.getHours() - maxAgeHours);

    const query = db
      .select()
      .from(botSessions)
      .where(
        and(
          eq(botSessions.organizationId, organizationId),
          inArray(botSessions.botStatus, statuses),
          gte(botSessions.createdAt, minCreatedAt)
        )
      )
      .orderBy(desc(botSessions.createdAt))
      .limit(limit);

    return await query;
  }

  /**
   * Find bot sessions by user ID
   */
  static async findByUserId(
    userId: string,
    organizationId: string,
    options?: { status?: BotStatus; limit?: number }
  ): Promise<BotSession[]> {
    const conditions = [
      eq(botSessions.userId, userId),
      eq(botSessions.organizationId, organizationId),
    ];

    if (options?.status) {
      conditions.push(eq(botSessions.botStatus, options.status));
    }

    const query = db
      .select()
      .from(botSessions)
      .where(and(...conditions))
      .orderBy(desc(botSessions.createdAt));

    if (options?.limit) {
      return await query.limit(options.limit);
    }

    return await query;
  }

  /**
   * Update bot session status
   */
  static async updateStatus(
    id: string,
    organizationId: string,
    status: BotStatus,
    error?: string
  ): Promise<BotSession | null> {
    const [session] = await db
      .update(botSessions)
      .set({
        botStatus: status,
        error: error ?? null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(botSessions.id, id),
          eq(botSessions.organizationId, organizationId)
        )
      )
      .returning();

    return session ?? null;
  }

  /**
   * Increment retry count for failed sessions
   */
  static async incrementRetryCount(
    id: string,
    organizationId: string
  ): Promise<BotSession | null> {
    const session = await this.findById(id, organizationId);
    if (!session) {
      return null;
    }

    const [updated] = await db
      .update(botSessions)
      .set({
        retryCount: session.retryCount + 1,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(botSessions.id, id),
          eq(botSessions.organizationId, organizationId)
        )
      )
      .returning();

    return updated ?? null;
  }

  /**
   * Update join/leave timestamps
   */
  static async updateJoinLeaveTimes(
    id: string,
    organizationId: string,
    joinedAt?: Date,
    leftAt?: Date
  ): Promise<BotSession | null> {
    const [session] = await db
      .update(botSessions)
      .set({
        joinedAt: joinedAt ?? null,
        leftAt: leftAt ?? null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(botSessions.id, id),
          eq(botSessions.organizationId, organizationId)
        )
      )
      .returning();

    return session ?? null;
  }

  /**
   * Update meeting participants list
   */
  static async updateParticipants(
    id: string,
    organizationId: string,
    participants: string[]
  ): Promise<BotSession | null> {
    const [session] = await db
      .update(botSessions)
      .set({
        meetingParticipants: participants,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(botSessions.id, id),
          eq(botSessions.organizationId, organizationId)
        )
      )
      .returning();

    return session ?? null;
  }

  /**
   * Get unique organization IDs that have active sessions needing polling
   * Used by status polling service to determine which organizations to poll
   */
  static async findOrganizationsWithActiveSessions(options?: {
    maxAgeHours?: number; // Default: 4 hours
    statuses?: BotStatus[]; // Default: ['joining', 'active']
    limit?: number; // Default: 1000
  }): Promise<string[]> {
    const maxAgeHours = options?.maxAgeHours ?? 4;
    const statuses = options?.statuses ?? ["joining", "active"];
    const limit = options?.limit ?? 1000;

    const minCreatedAt = new Date();
    minCreatedAt.setHours(minCreatedAt.getHours() - maxAgeHours);

    const sessions = await db
      .select({
        organizationId: botSessions.organizationId,
      })
      .from(botSessions)
      .where(
        and(
          inArray(botSessions.botStatus, statuses),
          gte(botSessions.createdAt, minCreatedAt)
        )
      )
      .limit(limit);

    // Extract unique organization IDs
    return [...new Set(sessions.map((s) => s.organizationId))];
  }

  /**
   * Find failed bot sessions that can be retried
   * Returns sessions with botStatus='failed' and retryCount < maxRetries
   * created within the specified time window
   */
  static async findFailedSessionsForRetry(options?: {
    maxRetries?: number; // Default: 3
    maxAgeHours?: number; // Default: 24 hours
    limit?: number; // Default: 100
  }): Promise<BotSession[]> {
    const maxRetries = options?.maxRetries ?? 3;
    const maxAgeHours = options?.maxAgeHours ?? 24;
    const limit = options?.limit ?? 100;

    const minCreatedAt = new Date();
    minCreatedAt.setHours(minCreatedAt.getHours() - maxAgeHours);

    // Filter by retryCount in SQL for better performance
    const failedSessions = await db
      .select()
      .from(botSessions)
      .where(
        and(
          eq(botSessions.botStatus, "failed"),
          gte(botSessions.createdAt, minCreatedAt),
          lt(botSessions.retryCount, maxRetries)
        )
      )
      .limit(limit);

    return failedSessions;
  }

  /**
   * Update bot session recording ID
   * Used by webhook handler to atomically update recordingId and recallStatus
   */
  static async updateRecordingId(
    recallBotId: string,
    organizationId: string,
    recordingId: string,
    recallStatus: BotSession["recallStatus"]
  ): Promise<BotSession | null> {
    const [updatedSession] = await db
      .update(botSessions)
      .set({
        recordingId,
        recallStatus,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(botSessions.recallBotId, recallBotId),
          eq(botSessions.organizationId, organizationId)
        )
      )
      .returning();

    return updatedSession ?? null;
  }

  /**
   * Update bot session and increment retry count atomically
   * Used by retry logic to ensure both operations succeed or fail together
   */
  static async updateAndIncrementRetryCount(
    id: string,
    organizationId: string,
    updates: Partial<
      Pick<BotSession, "recallBotId" | "recallStatus" | "botStatus" | "error">
    >
  ): Promise<BotSession | null> {
    // Get current session to read retryCount
    const session = await this.findById(id, organizationId);
    if (!session) {
      return null;
    }

    const [updated] = await db
      .update(botSessions)
      .set({
        ...updates,
        retryCount: session.retryCount + 1,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(botSessions.id, id),
          eq(botSessions.organizationId, organizationId)
        )
      )
      .returning();

    return updated ?? null;
  }

  /**
   * Find bot sessions with pagination, optionally filtered by status
   * Returns sessions with pagination metadata
   */
  static async findByStatusWithPagination(
    organizationId: string,
    options?: {
      status?: BotStatus | BotStatus[];
      limit?: number;
      offset?: number;
    }
  ): Promise<{
    sessions: BotSession[];
    total: number;
    hasMore: boolean;
    nextOffset: number | null;
  }> {
    const limit = options?.limit ?? 20;
    const offset = options?.offset ?? 0;

    // Build where conditions
    const conditions = [eq(botSessions.organizationId, organizationId)];

    if (options?.status) {
      if (Array.isArray(options.status)) {
        conditions.push(inArray(botSessions.botStatus, options.status));
      } else {
        conditions.push(eq(botSessions.botStatus, options.status));
      }
    }

    // Get total count
    const totalResult = await db
      .select({ count: count() })
      .from(botSessions)
      .where(and(...conditions));

    const total = totalResult[0]?.count ?? 0;

    // Get paginated sessions
    const sessions = await db
      .select()
      .from(botSessions)
      .where(and(...conditions))
      .orderBy(desc(botSessions.createdAt))
      .limit(limit + 1) // Fetch one extra to check if there are more
      .offset(offset);

    // Check if there are more results
    const hasMore = sessions.length > limit;
    const paginatedSessions = hasMore ? sessions.slice(0, limit) : sessions;
    const nextOffset = hasMore ? offset + limit : null;

    return {
      sessions: paginatedSessions,
      total,
      hasMore,
      nextOffset,
    };
  }

  /**
   * Find bot session by ID with joined recording data
   * Returns session with recording metadata if recordingId exists
   */
  static async findByIdWithRecording(
    id: string,
    organizationId: string
  ): Promise<
    | (BotSession & {
        recording?: {
          id: string;
          title: string;
          fileUrl: string;
          fileName: string;
          fileSize: number;
          fileMimeType: string;
          duration: number | null;
          recordingDate: Date;
        } | null;
      })
    | null
  > {
    const result = await db
      .select({
        // Bot session fields
        id: botSessions.id,
        recordingId: botSessions.recordingId,
        projectId: botSessions.projectId,
        organizationId: botSessions.organizationId,
        userId: botSessions.userId,
        recallBotId: botSessions.recallBotId,
        recallStatus: botSessions.recallStatus,
        meetingUrl: botSessions.meetingUrl,
        meetingTitle: botSessions.meetingTitle,
        calendarEventId: botSessions.calendarEventId,
        botStatus: botSessions.botStatus,
        joinedAt: botSessions.joinedAt,
        leftAt: botSessions.leftAt,
        error: botSessions.error,
        retryCount: botSessions.retryCount,
        meetingParticipants: botSessions.meetingParticipants,
        createdAt: botSessions.createdAt,
        updatedAt: botSessions.updatedAt,
        // Recording fields (nullable)
        recordingTitle: recordings.title,
        recordingFileUrl: recordings.fileUrl,
        recordingFileName: recordings.fileName,
        recordingFileSize: recordings.fileSize,
        recordingFileMimeType: recordings.fileMimeType,
        recordingDuration: recordings.duration,
        recordingDate: recordings.recordingDate,
      })
      .from(botSessions)
      .leftJoin(recordings, eq(botSessions.recordingId, recordings.id))
      .where(
        and(
          eq(botSessions.id, id),
          eq(botSessions.organizationId, organizationId)
        )
      )
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    const session: BotSession = {
      id: row.id,
      recordingId: row.recordingId,
      projectId: row.projectId,
      organizationId: row.organizationId,
      userId: row.userId,
      recallBotId: row.recallBotId,
      recallStatus: row.recallStatus,
      meetingUrl: row.meetingUrl,
      meetingTitle: row.meetingTitle,
      calendarEventId: row.calendarEventId,
      botStatus: row.botStatus,
      joinedAt: row.joinedAt,
      leftAt: row.leftAt,
      error: row.error,
      retryCount: row.retryCount,
      meetingParticipants: row.meetingParticipants,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };

    const recording =
      row.recordingId && row.recordingTitle
        ? {
            id: row.recordingId,
            title: row.recordingTitle,
            fileUrl: row.recordingFileUrl!,
            fileName: row.recordingFileName!,
            fileSize: row.recordingFileSize!,
            fileMimeType: row.recordingFileMimeType!,
            duration: row.recordingDuration,
            recordingDate: row.recordingDate!,
          }
        : null;

    return {
      ...session,
      recording,
    };
  }
}

