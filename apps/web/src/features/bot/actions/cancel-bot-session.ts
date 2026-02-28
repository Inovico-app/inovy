"use server";

import { CacheInvalidation } from "@/lib/cache-utils";
import { logger, serializeError } from "@/lib/logger";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { BotSessionsQueries } from "@/server/data-access/bot-sessions.queries";
import { BotProviderFactory } from "@/server/services/bot-providers/factory";
import { NotificationService } from "@/server/services/notification.service";
import { cancelBotSessionSchema } from "@/server/validation/bot/cancel-bot-session.schema";

/**
 * Server action to cancel a bot session
 * Can cancel sessions in scheduled, joining, or pending_consent status
 */
export const cancelBotSession = authorizedActionClient
  .metadata({ permissions: policyToPermissions("recordings:delete") })
  .schema(cancelBotSessionSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { sessionId } = parsedInput;
    const { user, organizationId } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated("User context required");
    }

    if (!organizationId) {
      throw ActionErrors.forbidden(
        "Organization context required",
        undefined,
        "cancel-bot-session"
      );
    }

    logger.info("Canceling bot session", {
      userId: user.id,
      organizationId,
      sessionId,
    });

    // Find session and verify ownership and status
    const session = await BotSessionsQueries.findById(
      sessionId,
      organizationId
    );

    if (!session) {
      throw ActionErrors.notFound(
        "Bot session not found",
        "cancel-bot-session"
      );
    }

    if (session.userId !== user.id) {
      throw ActionErrors.forbidden(
        "You can only cancel your own bot sessions",
        undefined,
        "cancel-bot-session"
      );
    }

    // Check if session is in cancellable status
    const cancellableStatuses: Array<typeof session.botStatus> = [
      "scheduled",
      "joining",
      "pending_consent",
    ];

    if (!cancellableStatuses.includes(session.botStatus)) {
      throw ActionErrors.badRequest(
        `Session cannot be canceled. Current status: ${session.botStatus}`,
        "cancel-bot-session"
      );
    }

    // Terminate bot session via provider (only if recallBotId exists)
    const provider = BotProviderFactory.getDefault();
    let terminateResult: Awaited<
      ReturnType<typeof provider.terminateSession>
    > | null = null;

    if (session.recallBotId) {
      terminateResult = await provider.terminateSession(session.recallBotId);
    } else {
      logger.info("Skipping provider termination - no recallBotId", {
        userId: user.id,
        organizationId,
        sessionId,
        status: session.botStatus,
      });
    }

    if (terminateResult?.isErr()) {
      logger.warn("Failed to terminate bot session via provider", {
        userId: user.id,
        organizationId,
        sessionId,
        recallBotId: session.recallBotId,
        error: terminateResult.error,
      });
      // Continue anyway - we'll mark it as failed
    }

    // Update session status to failed
    const updatedSession = await BotSessionsQueries.update(
      sessionId,
      organizationId,
      {
        botStatus: "failed",
        error: "Bot session canceled by user",
      }
    );

    if (!updatedSession) {
      throw ActionErrors.internal(
        "Failed to update bot session",
        undefined,
        "cancel-bot-session"
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
        title: "Bot session canceled",
        message: `Bot will not join "${session.meetingTitle || "meeting"}".`,
        metadata: {
          sessionId,
          action: "canceled",
        },
      });

      if (notificationResult.isErr()) {
        logger.warn("Failed to create cancellation notification", {
          userId: user.id,
          organizationId,
          sessionId,
          error: notificationResult.error.message,
        });
        // Continue - notification failure should not block the cancel action
      }
    } catch (error) {
      logger.error("Unexpected error creating cancellation notification", {
        userId: user.id,
        organizationId,
        sessionId,
        error: serializeError(error),
      });
      // Continue - notification failure should not block the cancel action
    }

    // Invalidate caches
    CacheInvalidation.invalidateBotSessions(organizationId);
    CacheInvalidation.invalidateBotSession(sessionId, organizationId);
    CacheInvalidation.invalidateNotifications(user.id, organizationId);

    logger.info("Successfully canceled bot session", {
      userId: user.id,
      organizationId,
      sessionId,
    });

    return { success: true, session: updatedSession };
  });

