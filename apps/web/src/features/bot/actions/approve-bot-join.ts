"use server";

import { CacheInvalidation } from "@/lib/cache-utils";
import { logger } from "@/lib/logger";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { BotSessionsQueries } from "@/server/data-access/bot-sessions.queries";
import { NotificationService } from "@/server/services/notification.service";
import { approveBotJoinSchema } from "@/server/validation/bot/approve-bot-join.schema";

/**
 * Server action to approve a bot session requiring consent
 */
export const approveBotJoin = authorizedActionClient
  .metadata({ permissions: policyToPermissions("recordings:create") })
  .schema(approveBotJoinSchema)
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
        "approve-bot-join"
      );
    }

    logger.info("Approving bot session", {
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
      throw ActionErrors.notFound("Bot session not found", "approve-bot-join");
    }

    if (session.userId !== user.id) {
      throw ActionErrors.forbidden(
        "You can only approve your own bot sessions",
        undefined,
        "approve-bot-join"
      );
    }

    if (session.botStatus !== "pending_consent") {
      throw ActionErrors.badRequest(
        `Session is not pending consent. Current status: ${session.botStatus}`,
        "approve-bot-join"
      );
    }

    // Update session status to scheduled
    const updatedSession = await BotSessionsQueries.update(
      sessionId,
      organizationId,
      {
        botStatus: "scheduled",
      }
    );

    if (!updatedSession) {
      throw ActionErrors.internal(
        "Failed to update bot session",
        undefined,
        "approve-bot-join"
      );
    }

    // Create confirmation notification
    await NotificationService.createNotification({
      recordingId: session.recordingId ?? null,
      projectId: session.projectId,
      userId: user.id,
      organizationId,
      type: "recording_processed",
      title: "Bot session approved",
      message: `Bot will join "${session.meetingTitle || "meeting"}" as scheduled.`,
      metadata: {
        sessionId,
        action: "approved",
      },
    });

    // Invalidate caches
    CacheInvalidation.invalidateNotifications(user.id, organizationId);

    logger.info("Successfully approved bot session", {
      userId: user.id,
      organizationId,
      sessionId,
    });

    return { success: true, session: updatedSession };
  });

