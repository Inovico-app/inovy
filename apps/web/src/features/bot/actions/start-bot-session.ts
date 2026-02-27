"use server";

import { logger } from "@/lib/logger";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import {
  authorizedActionClient,
  createErrorForNextSafeAction,
} from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { getCachedBotSettings } from "@/server/cache/bot-settings.cache";
import { BotSessionsQueries } from "@/server/data-access/bot-sessions.queries";
import { ProjectQueries } from "@/server/data-access/projects.queries";
import { RecallApiService } from "@/server/services/recall-api.service";
import { startBotSessionSchema } from "@/server/validation/bot/start-bot-session.schema";

/**
 * Start Bot Session Action
 * Initiates a Recall.ai bot session for a meeting from project context
 */
export const startBotSessionAction = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("recordings:create"), // Bot sessions create recordings
  })
  .inputSchema(startBotSessionSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { projectId, meetingUrl, meetingTitle } = parsedInput;
    const { user, organizationId } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated("User not found", "start-bot-session");
    }

    if (!organizationId) {
      throw ActionErrors.forbidden(
        "Organization context required",
        undefined,
        "start-bot-session"
      );
    }

    logger.info("Starting bot session", {
      component: "startBotSessionAction",
      projectId,
      meetingUrl,
      userId: user.id,
      organizationId,
    });

    // Verify project access
    const project = await ProjectQueries.findById(projectId, organizationId);
    if (!project) {
      throw ActionErrors.notFound("Project not found", "start-bot-session");
    }

    // Load bot settings for display name and join message
    const settingsResult = await getCachedBotSettings(user.id, organizationId);
    let botDisplayName: string | undefined;
    let botJoinMessage: string | null | undefined;

    if (settingsResult.isOk()) {
      botDisplayName = settingsResult.value.botDisplayName;
      botJoinMessage = settingsResult.value.botJoinMessage;
    }

    // Create bot session via Recall.ai API
    const botResult = await RecallApiService.createBotSession(
      meetingUrl,
      {
        projectId,
        organizationId,
        userId: user.id,
      },
      undefined,
      { botDisplayName, botJoinMessage }
    );

    if (botResult.isErr()) {
      throw createErrorForNextSafeAction(botResult.error);
    }

    const { botId, status } = botResult.value;

    // Create bot session record in database
    try {
      const session = await BotSessionsQueries.insert({
        projectId,
        organizationId,
        userId: user.id,
        recallBotId: botId,
        recallStatus: status,
        meetingUrl,
        meetingTitle: meetingTitle || null,
      });

      logger.info("Successfully created bot session", {
        component: "startBotSessionAction",
        sessionId: session.id,
        botId,
        projectId,
      });

      return {
        id: session.id,
        botId: session.recallBotId,
        status: session.recallStatus,
        meetingUrl: session.meetingUrl,
        meetingTitle: session.meetingTitle,
      };
    } catch (error) {
      logger.error("Failed to create bot session record", {
        component: "startBotSessionAction",
        error,
        botId,
      });

      throw ActionErrors.internal(
        "Failed to create bot session record",
        error as Error,
        "start-bot-session"
      );
    }
  });

