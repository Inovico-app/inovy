"use server";

import { CacheInvalidation } from "@/lib/cache-utils";
import { logger, serializeError } from "@/lib/logger";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { BotSessionsQueries } from "@/server/data-access/bot-sessions.queries";
import { BotProviderFactory } from "@/server/services/bot-providers/factory";
import { NotificationService } from "@/server/services/notification.service";
import { denyBotJoinSchema } from "@/server/validation/bot/deny-bot-join.schema";

/**
 * Server action to deny/cancel a bot session requiring consent
 */
export const denyBotJoin = authorizedActionClient
  .metadata({ permissions: policyToPermissions("recordings:delete") })
  .schema(denyBotJoinSchema)
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
        "deny-bot-join"
      );
    }

    logger.info("Denying bot session", {
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
      throw ActionErrors.notFound("Bot session not found", "deny-bot-join");
    }

    if (session.userId !== user.id) {
      throw ActionErrors.forbidden(
        "You can only deny your own bot sessions",
        undefined,
        "deny-bot-join"
      );
    }

    if (session.botStatus !== "pending_consent") {
      throw ActionErrors.badRequest(
        `Session is not pending consent. Current status: ${session.botStatus}`,
        "deny-bot-join"
      );
    }

    // Terminate bot session via provider
    const provider = BotProviderFactory.getDefault();
    const terminateResult = await provider.terminateSession(
      session.recallBotId
    );

    if (terminateResult.isErr()) {
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
        error: "Bot session denied by user",
      }
    );

    if (!updatedSession) {
      throw ActionErrors.internal(
        "Failed to update bot session",
        undefined,
        "deny-bot-join"
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
        title: "Bot session denied",
        message: `Bot will not join "${session.meetingTitle || "meeting"}".`,
        metadata: {
          sessionId,
          action: "denied",
        },
      });

      if (notificationResult.isErr()) {
        logger.warn("Failed to create denial notification", {
          userId: user.id,
          organizationId,
          sessionId,
          error: notificationResult.error.message,
        });
        // Continue - notification failure should not block the deny action
      }
    } catch (error) {
      logger.error("Unexpected error creating denial notification", {
        userId: user.id,
        organizationId,
        sessionId,
        error: serializeError(error),
      });
      // Continue - notification failure should not block the deny action
    }

    // Invalidate caches
    CacheInvalidation.invalidateNotifications(user.id, organizationId);

    logger.info("Successfully denied bot session", {
      userId: user.id,
      organizationId,
      sessionId,
    });

    return { success: true, session: updatedSession };
  });

