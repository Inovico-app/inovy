"use server";

import { CacheInvalidation } from "@/lib/cache-utils";
import { logger, serializeError } from "@/lib/logger";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import {
  authorizedActionClient,
  createErrorForNextSafeAction,
} from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { BotSessionsQueries } from "@/server/data-access/bot-sessions.queries";
import { BotProviderFactory } from "@/server/services/bot-providers/factory";
import { NotificationService } from "@/server/services/notification.service";
import { retryBotSessionSchema } from "@/server/validation/bot/retry-bot-session.schema";

const MAX_RETRIES = 3;

/**
 * Server action to retry a failed bot session
 * Can retry sessions in failed status with retryCount < MAX_RETRIES
 */
export const retryBotSession = authorizedActionClient
  .metadata({ permissions: policyToPermissions("recordings:create") })
  .schema(retryBotSessionSchema)
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
        "retry-bot-session"
      );
    }

    logger.info("Retrying bot session", {
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
      throw ActionErrors.notFound("Bot session not found", "retry-bot-session");
    }

    if (session.userId !== user.id) {
      throw ActionErrors.forbidden(
        "You can only retry your own bot sessions",
        undefined,
        "retry-bot-session"
      );
    }

    // Check if session is in retriable status
    if (session.botStatus !== "failed") {
      throw ActionErrors.badRequest(
        `Session cannot be retried. Current status: ${session.botStatus}`,
        "retry-bot-session"
      );
    }

    // Check retry count
    if (session.retryCount >= MAX_RETRIES) {
      throw ActionErrors.badRequest(
        `Maximum retry attempts (${MAX_RETRIES}) reached for this session`,
        "retry-bot-session"
      );
    }

    // Verify meeting URL is still valid
    if (!session.meetingUrl || session.meetingUrl.trim() === "") {
      throw ActionErrors.badRequest(
        "Meeting URL is empty or invalid",
        "retry-bot-session"
      );
    }

    // Attempt to recreate bot session
    const provider = BotProviderFactory.getDefault();
    const customMetadata: Record<string, string> = {
      organizationId: session.organizationId,
      userId: session.userId,
      projectId: session.projectId,
    };

    // Only include calendarEventId if it exists
    if (session.calendarEventId) {
      customMetadata.calendarEventId = session.calendarEventId;
    }

    const createResult = await provider.createSession({
      meetingUrl: session.meetingUrl,
      customMetadata,
    });

    if (createResult.isErr()) {
      // Increment retry count even on failure
      try {
        await BotSessionsQueries.incrementRetryCount(
          session.id,
          session.organizationId
        );
      } catch (incrementError) {
        logger.error("Failed to increment retry count", {
          userId: user.id,
          organizationId,
          sessionId,
          recallBotId: session.recallBotId,
          attemptedRetryCount: session.retryCount + 1,
          error: serializeError(incrementError),
        });
        // Continue to throw the provider error - increment failure should not mask the original error
      }

      logger.error("Failed to recreate bot session", {
        userId: user.id,
        organizationId,
        sessionId,
        recallBotId: session.recallBotId,
        retryCount: session.retryCount + 1,
        error: createResult.error,
      });

      throw createErrorForNextSafeAction(createResult.error);
    }

    const { providerId, status, internalStatus } = createResult.value;

    // Update session with new bot ID, reset status, and increment retry count atomically
    const updatedSession =
      await BotSessionsQueries.updateAndIncrementRetryCount(
        session.id,
        session.organizationId,
        {
          recallBotId: providerId, // Update to new bot ID
          recallStatus: status,
          botStatus: internalStatus,
          error: null, // Clear previous error
        }
      );

    if (!updatedSession) {
      throw ActionErrors.internal(
        "Failed to update session and increment retry count",
        undefined,
        "retry-bot-session"
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
        title: "Bot session retry initiated",
        message: `Retrying bot session for "${session.meetingTitle || "meeting"}".`,
        metadata: {
          sessionId,
          action: "retry",
          retryCount: updatedSession.retryCount,
        },
      });

      if (notificationResult.isErr()) {
        logger.warn("Failed to create retry notification", {
          userId: user.id,
          organizationId,
          sessionId,
          error: notificationResult.error.message,
        });
        // Continue - notification failure should not block the retry action
      }
    } catch (error) {
      logger.error("Unexpected error creating retry notification", {
        userId: user.id,
        organizationId,
        sessionId,
        error: serializeError(error),
      });
      // Continue - notification failure should not block the retry action
    }

    // Invalidate caches
    CacheInvalidation.invalidateBotSessions(organizationId);
    CacheInvalidation.invalidateBotSession(sessionId, organizationId);
    CacheInvalidation.invalidateNotifications(user.id, organizationId);

    logger.info("Successfully retried bot session", {
      userId: user.id,
      organizationId,
      sessionId,
      newRecallBotId: providerId,
      retryCount: updatedSession.retryCount,
    });

    return { success: true, session: updatedSession };
  });

