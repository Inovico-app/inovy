import { and, desc, eq } from "drizzle-orm";
import { db } from "../db";
import {
  botSessions,
  type BotSession,
  type BotStatus,
  type NewBotSession,
} from "../db/schema/bot-sessions";

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
        | "botStatus"
        | "calendarEventId"
        | "error"
        | "meetingTitle"
        | "meetingParticipants"
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
    data: Partial<Pick<BotSession, "recordingId" | "recallStatus">>
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
}

