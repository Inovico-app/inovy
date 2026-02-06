import { and, eq } from "drizzle-orm";
import { db } from "../db";
import {
  botSettings,
  type BotSettings,
  type NewBotSettings,
} from "../db/schema/bot-settings";

/**
 * Database queries for Bot Settings operations
 * Pure data access layer - no business logic
 */
export class BotSettingsQueries {
  /**
   * Get user's bot settings
   */
  static async findByUserId(
    userId: string,
    organizationId: string
  ): Promise<BotSettings | null> {
    const result = await db
      .select()
      .from(botSettings)
      .where(
        and(
          eq(botSettings.userId, userId),
          eq(botSettings.organizationId, organizationId)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * Find all users with bot enabled
   * Used for calendar monitoring workflow
   */
  static async findAllEnabled(organizationId?: string): Promise<BotSettings[]> {
    const conditions = [eq(botSettings.botEnabled, true)];

    if (organizationId) {
      conditions.push(eq(botSettings.organizationId, organizationId));
    }

    return await db
      .select()
      .from(botSettings)
      .where(and(...conditions));
  }

  /**
   * Create or update bot settings (upsert)
   */
  static async upsert(settings: NewBotSettings): Promise<BotSettings> {
    return await db.transaction(async (tx) => {
      // Check if settings exist
      const existing = await tx
        .select()
        .from(botSettings)
        .where(
          and(
            eq(botSettings.userId, settings.userId),
            eq(botSettings.organizationId, settings.organizationId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // Update existing
        const [updated] = await tx
          .update(botSettings)
          .set({
            botEnabled: settings.botEnabled,
            autoJoinEnabled: settings.autoJoinEnabled,
            requirePerMeetingConsent: settings.requirePerMeetingConsent,
            botDisplayName: settings.botDisplayName,
            botJoinMessage: settings.botJoinMessage,
            calendarIds: settings.calendarIds,
            inactivityTimeoutMinutes: settings.inactivityTimeoutMinutes,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(botSettings.userId, settings.userId),
              eq(botSettings.organizationId, settings.organizationId)
            )
          )
          .returning();

        return updated;
      } else {
        // Insert new
        const [created] = await tx
          .insert(botSettings)
          .values(settings)
          .returning();

        return created;
      }
    });
  }

  /**
   * Update specific fields of bot settings
   */
  static async update(
    userId: string,
    organizationId: string,
    updates: Partial<
      Omit<BotSettings, "id" | "userId" | "organizationId" | "createdAt">
    >
  ): Promise<BotSettings | null> {
    const [settings] = await db
      .update(botSettings)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(botSettings.userId, userId),
          eq(botSettings.organizationId, organizationId)
        )
      )
      .returning();

    return settings ?? null;
  }

  /**
   * Delete user's bot settings
   */
  static async delete(
    userId: string,
    organizationId: string
  ): Promise<boolean> {
    const result = await db
      .delete(botSettings)
      .where(
        and(
          eq(botSettings.userId, userId),
          eq(botSettings.organizationId, organizationId)
        )
      )
      .returning();

    return result.length > 0;
  }
}

