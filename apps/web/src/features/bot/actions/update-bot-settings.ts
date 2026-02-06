"use server";

import { CacheInvalidation } from "@/lib/cache-utils";
import { logger } from "@/lib/logger";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { BotSettingsQueries } from "@/server/data-access/bot-settings.queries";
import { botSettingsSchema } from "@/server/validation/bot/bot-settings.schema";

/**
 * Server action to update bot settings
 */
export const updateBotSettings = authorizedActionClient
  .metadata({ permissions: policyToPermissions("settings:update") })
  .schema(botSettingsSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { user, organizationId } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated("User context required");
    }

    if (!organizationId) {
      throw ActionErrors.forbidden(
        "Organization context required",
        undefined,
        "update-bot-settings"
      );
    }

    logger.info("Updating bot settings", {
      userId: user.id,
      organizationId,
      botEnabled: parsedInput.botEnabled,
    });

    const settings = await BotSettingsQueries.upsert({
      userId: user.id,
      organizationId,
      botEnabled: parsedInput.botEnabled,
      autoJoinEnabled: parsedInput.autoJoinEnabled,
      requirePerMeetingConsent: parsedInput.requirePerMeetingConsent,
      botDisplayName: parsedInput.botDisplayName,
      botJoinMessage: parsedInput.botJoinMessage ?? null,
      calendarIds: parsedInput.calendarIds ?? null,
      inactivityTimeoutMinutes: parsedInput.inactivityTimeoutMinutes,
    });

    // Invalidate cache
    CacheInvalidation.invalidateBotSettings(user.id, organizationId);

    logger.info("Successfully updated bot settings", {
      userId: user.id,
      organizationId,
      settingsId: settings.id,
    });

    return settings;
  });

