import { and, desc, eq } from "drizzle-orm";
import { db } from "../db";
import type { AutoAction, NewAutoAction } from "../db/schema";
import { autoActions, recordings, tasks } from "../db/schema";

/**
 * Auto Actions Queries
 * Manages auto actions for third-party integrations (Google, Microsoft)
 */
export class AutoActionsQueries {
  /**
   * Get recent auto actions
   */
  static async getRecentAutoActions(
    userId: string,
    organizationId: string,
    provider: "google" | "microsoft",
    options?: {
      limit?: number;
      type?: "calendar_event" | "email_draft";
    }
  ): Promise<
    Array<AutoAction & { recordingTitle?: string; taskTitle?: string }>
  > {
    const limit = options?.limit ?? 50;
    const query = db
      .select({
        action: autoActions,
        recordingTitle: recordings.title,
        taskTitle: tasks.title,
      })
      .from(autoActions)
      .innerJoin(recordings, eq(autoActions.recordingId, recordings.id))
      .leftJoin(tasks, eq(autoActions.taskId, tasks.id))
      .where(
        and(
          eq(autoActions.userId, userId),
          eq(recordings.organizationId, organizationId),
          eq(autoActions.provider, provider),
          options?.type ? eq(autoActions.type, options.type) : undefined
        )
      )
      .orderBy(desc(autoActions.createdAt))
      .limit(limit);
    const results = await query;
    return results.map((r) => ({
      ...r.action,
      recordingTitle: r.recordingTitle ?? undefined,
      taskTitle: r.taskTitle ?? undefined,
    }));
  }

  /**
   * Get auto action stats
   */
  static async getAutoActionStats(
    userId: string,
    organizationId: string,
    provider: "google" | "microsoft"
  ): Promise<{
    total: number;
    completed: number;
    failed: number;
    pending: number;
    calendarEvents: number;
    emailDrafts: number;
  }> {
    const results = await db
      .select({
        action: autoActions,
      })
      .from(autoActions)
      .innerJoin(recordings, eq(autoActions.recordingId, recordings.id))
      .where(
        and(
          eq(autoActions.userId, userId),
          eq(recordings.organizationId, organizationId),
          eq(autoActions.provider, provider)
        )
      );

    const actions = results.map((r) => r.action);
    return {
      total: actions.length,
      completed: actions.filter((a) => a.status === "completed").length,
      failed: actions.filter((a) => a.status === "failed").length,
      pending: actions.filter(
        (a) => a.status === "pending" || a.status === "processing"
      ).length,
      calendarEvents: actions.filter((a) => a.type === "calendar_event").length,
      emailDrafts: actions.filter((a) => a.type === "email_draft").length,
    };
  }

  /**
   * Retry a failed auto action
   */
  static async retryAutoAction(
    actionId: string,
    userId: string,
    organizationId: string
  ): Promise<AutoAction | null> {
    const results = await db
      .select({
        action: autoActions,
      })
      .from(autoActions)
      .innerJoin(recordings, eq(autoActions.recordingId, recordings.id))
      .where(
        and(
          eq(autoActions.id, actionId),
          eq(autoActions.userId, userId),
          eq(recordings.organizationId, organizationId)
        )
      )
      .limit(1);

    if (results.length === 0) {
      return null;
    }

    const action = results[0].action;
    if (action.status !== "failed") {
      return null;
    }

    const [updated] = await db
      .update(autoActions)
      .set({
        status: "pending",
        retryCount: action.retryCount + 1,
        errorMessage: null,
        processedAt: null,
      })
      .where(eq(autoActions.id, actionId))
      .returning();
    return updated || null;
  }

  /**
   * Create a new auto action
   */
  static async createAutoAction(data: NewAutoAction): Promise<AutoAction> {
    const [action] = await db.insert(autoActions).values(data).returning();
    return action;
  }

  /**
   * Update the status of an auto action
   */
  static async updateAutoActionStatus(
    actionId: string,
    status: "completed" | "failed" | "processing",
    errorMessage?: string | null
  ): Promise<AutoAction | null> {
    const [updated] = await db
      .update(autoActions)
      .set({
        status,
        processedAt: new Date(),
        errorMessage,
      })
      .where(eq(autoActions.id, actionId))
      .returning();
    return updated || null;
  }
}

