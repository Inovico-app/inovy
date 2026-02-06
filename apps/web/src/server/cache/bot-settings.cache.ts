import { CacheTags } from "@/lib/cache-utils";
import { logger } from "@/lib/logger";
import { BotSettingsQueries } from "@/server/data-access/bot-settings.queries";
import type { BotSettings } from "@/server/db/schema/bot-settings";
import { err, fromPromise, ok, type Result } from "neverthrow";
import { cacheTag, updateTag } from "next/cache";

/**
 * Cached bot settings queries
 * Uses Next.js 16 cache with tags for invalidation
 */

/**
 * Internal cached read-only helper for bot settings
 * Only reads from database, does not perform writes
 * Returns plain data (not Result) for Next.js cache serialization
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

  const result = await fromPromise(
    BotSettingsQueries.findByUserId(userId, organizationId),
    (error) => error as Error
  );

  // Unwrap Result for Next.js cache serialization
  return result.isOk() ? result.value : null;
}

/**
 * Get cached bot settings for a user
 * Returns settings or creates default if none exist
 * Writes are performed outside the cache boundary to avoid race conditions
 */
export async function getCachedBotSettings(
  userId: string,
  organizationId: string
): Promise<Result<BotSettings, Error>> {
  // Get cached settings (already unwrapped from Result)
  let settings = await getCachedBotSettingsInternal(userId, organizationId);

  // Create default settings if none exist (outside cache boundary)
  if (!settings) {
    logger.info("Creating default bot settings", {
      userId,
      organizationId,
    });

    const upsertResult = await fromPromise(
      BotSettingsQueries.upsert({
        userId,
        organizationId,
        botEnabled: false,
        autoJoinEnabled: false,
        requirePerMeetingConsent: true,
        botDisplayName: "Inovy Recording Bot",
        botJoinMessage: null,
        calendarIds: null,
        inactivityTimeoutMinutes: 60,
      }),
      (error) => error as Error
    );

    if (upsertResult.isErr()) {
      logger.error("Failed to create default bot settings", {
        userId,
        organizationId,
        error: upsertResult.error,
      });
      return err(upsertResult.error);
    }

    settings = upsertResult.value;

    // Invalidate cache immediately after creation to ensure consistency
    updateTag(CacheTags.botSettings(userId, organizationId));
  }

  return ok(settings);
}

