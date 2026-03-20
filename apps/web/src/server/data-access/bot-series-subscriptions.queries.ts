// src/server/data-access/bot-series-subscriptions.queries.ts
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import {
  botSeriesSubscriptions,
  type BotSeriesSubscription,
  type NewBotSeriesSubscription,
} from "../db/schema/bot-series-subscriptions";
import { botSettings } from "../db/schema/bot-settings";

export class BotSeriesSubscriptionsQueries {
  static async findById(id: string): Promise<BotSeriesSubscription | null> {
    const result = await db
      .select()
      .from(botSeriesSubscriptions)
      .where(eq(botSeriesSubscriptions.id, id))
      .limit(1);

    return result[0] ?? null;
  }

  static async findByUserAndOrg(
    userId: string,
    organizationId: string,
  ): Promise<BotSeriesSubscription[]> {
    return db
      .select()
      .from(botSeriesSubscriptions)
      .where(
        and(
          eq(botSeriesSubscriptions.userId, userId),
          eq(botSeriesSubscriptions.organizationId, organizationId),
          eq(botSeriesSubscriptions.active, true),
        ),
      );
  }

  static async findByUserAndSeriesId(
    userId: string,
    recurringSeriesId: string,
    organizationId: string,
  ): Promise<BotSeriesSubscription | null> {
    const result = await db
      .select()
      .from(botSeriesSubscriptions)
      .where(
        and(
          eq(botSeriesSubscriptions.userId, userId),
          eq(botSeriesSubscriptions.recurringSeriesId, recurringSeriesId),
          eq(botSeriesSubscriptions.organizationId, organizationId),
        ),
      )
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * Find all active subscriptions where the user also has botEnabled: true.
   * Groups by (userId, organizationId) for the calendar monitor.
   */
  static async findAllActiveWithBotEnabled(): Promise<
    Array<
      BotSeriesSubscription & {
        botDisplayName: string;
        botJoinMessage: string | null;
      }
    >
  > {
    return db
      .select({
        id: botSeriesSubscriptions.id,
        userId: botSeriesSubscriptions.userId,
        organizationId: botSeriesSubscriptions.organizationId,
        recurringSeriesId: botSeriesSubscriptions.recurringSeriesId,
        calendarProvider: botSeriesSubscriptions.calendarProvider,
        calendarId: botSeriesSubscriptions.calendarId,
        seriesTitle: botSeriesSubscriptions.seriesTitle,
        active: botSeriesSubscriptions.active,
        createdAt: botSeriesSubscriptions.createdAt,
        updatedAt: botSeriesSubscriptions.updatedAt,
        botDisplayName: botSettings.botDisplayName,
        botJoinMessage: botSettings.botJoinMessage,
      })
      .from(botSeriesSubscriptions)
      .innerJoin(
        botSettings,
        and(
          eq(botSeriesSubscriptions.userId, botSettings.userId),
          eq(botSeriesSubscriptions.organizationId, botSettings.organizationId),
        ),
      )
      .where(
        and(
          eq(botSeriesSubscriptions.active, true),
          eq(botSettings.botEnabled, true),
        ),
      );
  }

  static async insert(
    subscription: NewBotSeriesSubscription,
  ): Promise<BotSeriesSubscription> {
    const [created] = await db
      .insert(botSeriesSubscriptions)
      .values(subscription)
      .returning();

    return created;
  }

  static async update(
    id: string,
    updates: Partial<Omit<BotSeriesSubscription, "id" | "createdAt">>,
  ): Promise<BotSeriesSubscription | null> {
    const [updated] = await db
      .update(botSeriesSubscriptions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(botSeriesSubscriptions.id, id))
      .returning();

    return updated ?? null;
  }

  static async deactivate(id: string): Promise<BotSeriesSubscription | null> {
    return this.update(id, { active: false });
  }
}
