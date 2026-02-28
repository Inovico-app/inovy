"use server";

import { CacheInvalidation } from "@/lib/cache-utils";
import { logger } from "@/lib/logger";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { BotSessionsQueries } from "@/server/data-access/bot-sessions.queries";
import { updateBotSessionMeetingUrlSchema } from "@/server/validation/meetings/update-bot-session-meeting-url.schema";

const EDITABLE_BOT_STATUSES = ["scheduled", "failed"] as const;

/**
 * Update bot session meeting URL
 * Only allowed for scheduled or failed bot sessions
 */
export const updateBotSessionMeetingUrl = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("recordings:create"),
    name: "update-bot-session-meeting-url",
  })
  .schema(updateBotSessionMeetingUrlSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { user, organizationId } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated("User context required");
    }

    if (!organizationId) {
      throw ActionErrors.forbidden("Organization context required");
    }

    const { sessionId, meetingUrl } = parsedInput;

    const session = await BotSessionsQueries.findById(sessionId, organizationId);

    if (!session) {
      throw ActionErrors.notFound(
        "Bot session not found",
        "update-bot-session-meeting-url"
      );
    }

    if (session.userId !== user.id) {
      throw ActionErrors.forbidden(
        "You can only update your own bot sessions",
        undefined,
        "update-bot-session-meeting-url"
      );
    }

    if (!EDITABLE_BOT_STATUSES.includes(session.botStatus as (typeof EDITABLE_BOT_STATUSES)[number])) {
      throw ActionErrors.badRequest(
        `Cannot update meeting URL when bot status is ${session.botStatus}. Only scheduled or failed sessions can be updated.`,
        "update-bot-session-meeting-url"
      );
    }

    const trimmedUrl = meetingUrl.trim();

    logger.info("Updating bot session meeting URL", {
      userId: user.id,
      organizationId,
      sessionId,
    });

    const updated = await BotSessionsQueries.update(
      sessionId,
      organizationId,
      { meetingUrl: trimmedUrl }
    );

    if (!updated) {
      throw ActionErrors.internal(
        "Failed to update bot session",
        undefined,
        "update-bot-session-meeting-url"
      );
    }

    CacheInvalidation.invalidateBotSession(sessionId, organizationId);
    CacheInvalidation.invalidateBotSessions(organizationId);

    logger.info("Successfully updated bot session meeting URL", {
      userId: user.id,
      sessionId,
    });

    return { success: true, meetingUrl: trimmedUrl } as const;
  });
