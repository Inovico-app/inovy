"use server";

import { logger } from "@/lib/logger";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { BotSessionsQueries } from "@/server/data-access/bot-sessions.queries";
import { z } from "zod";

const getBotSessionsSchema = z.object({
  calendarEventIds: z.array(z.string()),
});

/**
 * Get bot sessions for calendar event IDs
 */
export const getBotSessions = authorizedActionClient
  .metadata({ permissions: policyToPermissions("recordings:read") })
  .schema(getBotSessionsSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { organizationId } = ctx;

    if (!organizationId) {
      throw ActionErrors.forbidden("Organization context required");
    }

    const { calendarEventIds } = parsedInput;

    if (calendarEventIds.length === 0) {
      return new Map<string, unknown>();
    }

    logger.info("Fetching bot sessions", {
      organizationId,
      eventCount: calendarEventIds.length,
    });

    const sessionsMap = await BotSessionsQueries.findByCalendarEventIds(
      calendarEventIds,
      organizationId
    );

    // Convert Map to plain object for serialization
    return Object.fromEntries(sessionsMap);
  });
