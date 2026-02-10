"use server";

import { logger } from "@/lib/logger";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { getCachedBotSettings } from "@/server/cache/bot-settings.cache";
import { GoogleCalendarService } from "@/server/services/google-calendar.service";
import { GoogleOAuthService } from "@/server/services/google-oauth.service";
import { z } from "zod";

const getMeetingsSchema = z.object({
  timeMin: z.coerce.date(),
  timeMax: z.coerce.date(),
});

/**
 * Get calendar meetings for a date range
 */
export const getMeetings = authorizedActionClient
  .metadata({ permissions: policyToPermissions("recordings:read") })
  .schema(getMeetingsSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { user, organizationId } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated("User context required");
    }

    if (!organizationId) {
      throw ActionErrors.forbidden("Organization context required");
    }

    // Check if user has Google connection
    const hasConnection = await GoogleOAuthService.hasConnection(user.id);

    if (hasConnection.isErr() || !hasConnection.value) {
      throw ActionErrors.badRequest(
        "Google account not connected. Please connect in settings first."
      );
    }

    // Get bot settings to determine which calendars to fetch
    const settingsResult = await getCachedBotSettings(user.id, organizationId);

    if (settingsResult.isErr()) {
      logger.error("Failed to load bot settings", {
        userId: user.id,
        organizationId,
        error: settingsResult.error,
      });
      throw ActionErrors.internal(
        "Failed to load bot settings",
        settingsResult.error,
        "get-meetings"
      );
    }

    const { timeMin, timeMax } = parsedInput;

    logger.info("Fetching calendar meetings", {
      userId: user.id,
      organizationId,
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      calendarIds: settingsResult.value.calendarIds,
    });

    const result = await GoogleCalendarService.getUpcomingMeetings(user.id, {
      timeMin,
      timeMax,
      calendarIds: settingsResult.value.calendarIds ?? undefined,
    });

    if (result.isErr()) {
      logger.error("Failed to fetch meetings", {
        userId: user.id,
        organizationId,
        error: result.error.message,
        errorCode: result.error.code,
      });

      if (result.error.code === "BAD_REQUEST") {
        throw ActionErrors.badRequest(
          result.error.message,
          "get-meetings"
        );
      }

      throw ActionErrors.internal(
        result.error.message,
        result.error.cause,
        "get-meetings"
      );
    }

    return result.value;
  });
