import { CacheTags } from "@/lib/cache-utils";
import { logger } from "@/lib/logger";
import { BotSettingsQueries } from "@/server/data-access/bot-settings.queries";
import type { BotSettings } from "@/server/db/schema/bot-settings";
import { cacheTag, revalidateTag } from "next/cache";

/**
 * Cached bot settings queries
 * Uses Next.js 16 cache with tags for invalidation
 */

/**
 * Internal cached read-only helper for bot settings
 * Only reads from database, does not perform writes
 */
async function getCachedBotSettingsInternal(
  userId: string,
  organizationId: string
): Promise<BotSettings | null> {
  "use cache";
  cacheTag(CacheTags.botSettings(userId, organizationId));

  logger.info("Fetching bot settings", {
    userId,
    organizationId,
  });

  return await BotSettingsQueries.findByUserId(userId, organizationId);
}

/**
 * Get cached bot settings for a user
 * Returns settings or creates default if none exist
 * Writes are performed outside the cache boundary to avoid race conditions
 */
export async function getCachedBotSettings(
  userId: string,
  organizationId: string
): Promise<BotSettings> {
  let settings = await getCachedBotSettingsInternal(userId, organizationId);

  // Create default settings if none exist (outside cache boundary)
  if (!settings) {
    logger.info("Creating default bot settings", {
      userId,
      organizationId,
    });

    settings = await BotSettingsQueries.upsert({
      userId,
      organizationId,
      botEnabled: false,
      autoJoinEnabled: false,
      requirePerMeetingConsent: true,
      botDisplayName: "Inovy Recording Bot",
      botJoinMessage: null,
      calendarIds: null,
      inactivityTimeoutMinutes: 60,
    });

    // Invalidate cache after creation to ensure consistency
    revalidateTag(CacheTags.botSettings(userId, organizationId), "max");
  }

  return settings;
}
