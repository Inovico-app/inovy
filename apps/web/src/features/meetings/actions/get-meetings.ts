"use server";

import { logger } from "@/lib/logger";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { getCachedBotSettings } from "@/server/cache/bot-settings.cache";
import { getCalendarProvider } from "@/server/services/calendar/calendar-provider-factory";
import { z } from "zod";

const getMeetingsSchema = z.object({
  timeMin: z.coerce.date(),
  timeMax: z.coerce.date(),
});

/**
 * Get calendar meetings for a date range.
 * Uses the factory to resolve the connected calendar provider (Google or Microsoft).
 */
export const getMeetings = authorizedActionClient
  .metadata({
    name: "get-meetings",
    permissions: policyToPermissions("recordings:read"),
    audit: {
      resourceType: "meeting",
      action: "list",
      category: "read",
    },
  })
  .schema(getMeetingsSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { user, organizationId } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated("User context required");
    }

    if (!organizationId) {
      throw ActionErrors.forbidden("Organization context required");
    }

    // Resolve connected calendar provider (Google or Microsoft)
    const providerResult = await getCalendarProvider(user.id);

    if (providerResult.isErr()) {
      throw ActionErrors.badRequest(
        "No calendar account connected. Please connect Google or Microsoft in settings first.",
      );
    }

    const { provider } = providerResult.value;

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
        "get-meetings",
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

    const result = await provider.getUpcomingMeetings(user.id, {
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
        throw ActionErrors.badRequest(result.error.message, "get-meetings");
      }

      throw ActionErrors.internal(
        result.error.message,
        result.error.cause,
        "get-meetings",
      );
    }

    return {
      events: result.value,
      calendarProvider: providerResult.value.providerType,
    };
  });
