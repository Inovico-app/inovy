import { and, desc, eq } from "drizzle-orm";
import { db } from "../db";
import { botSessions } from "../db/schema";
import type { BotSession, NewBotSession } from "../db/schema/bot-sessions";

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
}

