"use server";

import { CacheInvalidation } from "@/lib/cache-utils";
import { logger, serializeError } from "@/lib/logger";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { BotSessionsQueries } from "@/server/data-access/bot-sessions.queries";
import { BotProviderFactory } from "@/server/services/bot-providers/factory";
import { NotificationService } from "@/server/services/notification.service";
import { removeBotFromMeetingSchema } from "@/server/validation/meetings/remove-bot-from-meeting.schema";

const STATUSES_REQUIRING_TERMINATION = [
  "scheduled",
  "joining",
  "pending_consent",
  "active",
  "leaving",
] as const;

/**
 * Server action to remove a bot from a meeting
 * Accepts either calendarEventId (for meetings UI) or sessionId (for bot sessions page)
 * Can remove bots in any status - terminates provider session if active
 */
export const removeBotFromMeeting = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("recordings:delete"),
    name: "remove-bot-from-meeting",
  })
  .schema(removeBotFromMeetingSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { calendarEventId, sessionId } = parsedInput;
    const { user, organizationId } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated("User context required");
    }

    if (!organizationId) {
      throw ActionErrors.forbidden(
        "Organization context required",
        undefined,
        "remove-bot-from-meeting"
      );
    }

    logger.info("Removing bot from meeting", {
      userId: user.id,
      organizationId,
      calendarEventId,
      sessionId,
    });

    // Find session by calendarEventId or sessionId (schema guarantees at least one)
    let session;
    if (sessionId) {
      session = await BotSessionsQueries.findById(sessionId, organizationId);
    } else {
      session = await BotSessionsQueries.findByCalendarEventId(
        calendarEventId!,
        organizationId
      );
    }

    if (!session) {
      throw ActionErrors.notFound(
        "Bot session not found",
        "remove-bot-from-meeting"
      );
    }

    if (session.userId !== user.id) {
      throw ActionErrors.forbidden(
        "You can only remove your own bot sessions",
        undefined,
        "remove-bot-from-meeting"
      );
    }

    // Terminate bot session via provider if in a status that requires it
    const needsTermination = STATUSES_REQUIRING_TERMINATION.includes(
      session.botStatus as (typeof STATUSES_REQUIRING_TERMINATION)[number]
    );

    if (needsTermination && session.recallBotId) {
      const provider = BotProviderFactory.getDefault();
      const terminateResult = await provider.terminateSession(
        session.recallBotId
      );

      if (terminateResult.isErr()) {
        logger.warn("Failed to terminate bot session via provider", {
          userId: user.id,
          organizationId,
          sessionId: session.id,
          recallBotId: session.recallBotId,
          error: terminateResult.error,
        });
        // Continue anyway - we'll mark it as failed
      }
    } else if (needsTermination && !session.recallBotId) {
      logger.info("Skipping provider termination - no recallBotId", {
        userId: user.id,
        organizationId,
        sessionId: session.id,
        status: session.botStatus,
      });
    }

    // Update session status to failed
    const updatedSession = await BotSessionsQueries.update(
      session.id,
      organizationId,
      {
        botStatus: "failed",
        error: "Bot session removed by user",
      }
    );

    if (!updatedSession) {
      throw ActionErrors.internal(
        "Failed to update bot session",
        undefined,
        "remove-bot-from-meeting"
      );
    }

    // Create confirmation notification
    try {
      const notificationResult = await NotificationService.createNotification({
        recordingId: session.recordingId ?? null,
        projectId: session.projectId,
        userId: user.id,
        organizationId,
        type: "bot_session_update",
        title: "Bot removed from meeting",
        message: `Bot will not join "${session.meetingTitle || "meeting"}".`,
        metadata: {
          sessionId: session.id,
          action: "removed",
        },
      });

      if (notificationResult.isErr()) {
        logger.warn("Failed to create removal notification", {
          userId: user.id,
          organizationId,
          sessionId: session.id,
          error: notificationResult.error.message,
        });
      }
    } catch (error) {
      logger.error("Unexpected error creating removal notification", {
        userId: user.id,
        organizationId,
        sessionId: session.id,
        error: serializeError(error),
      });
    }

    // Invalidate caches
    CacheInvalidation.invalidateBotSessions(organizationId);
    CacheInvalidation.invalidateBotSession(session.id, organizationId);
    CacheInvalidation.invalidateNotifications(user.id, organizationId);

    logger.info("Successfully removed bot from meeting", {
      userId: user.id,
      organizationId,
      sessionId: session.id,
    });

    return {
      success: true,
      session: updatedSession,
      calendarEventId: session.calendarEventId,
    } as const;
  });
