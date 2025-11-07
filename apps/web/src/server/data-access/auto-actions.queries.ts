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
      .leftJoin(recordings, eq(autoActions.recordingId, recordings.id))
      .leftJoin(tasks, eq(autoActions.taskId, tasks.id))
      .where(
        and(
          eq(autoActions.userId, userId),
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
    provider: "google" | "microsoft"
  ): Promise<{
    total: number;
    completed: number;
    failed: number;
    pending: number;
    calendarEvents: number;
    emailDrafts: number;
  }> {
    const actions = await db
      .select()
      .from(autoActions)
      .where(
        and(eq(autoActions.userId, userId), eq(autoActions.provider, provider))
      );
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
    userId: string
  ): Promise<AutoAction | null> {
    const [action] = await db
      .select()
      .from(autoActions)
      .where(and(eq(autoActions.id, actionId), eq(autoActions.userId, userId)))
      .limit(1);
    if (!action || action.status !== "failed") {
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

